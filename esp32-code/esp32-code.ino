#define ENABLE_USER_AUTH
#define ENABLE_DATABASE

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <FirebaseClient.h>
#include <DHT.h>
#include <time.h>

// =====================================================
// 1. KONFIGURASI WIFI
// =====================================================
#define WIFI_SSID     "p"
#define WIFI_PASSWORD "15000000"

// =====================================================
// 2. KONFIGURASI FIREBASE
// =====================================================
#define API_KEY       "AIzaSyDWmQ9BmXsvph7gmFcFk1zIUdw7bUJq4Xo"
#define USER_EMAIL    "esp32@gmail.com"
#define USER_PASSWORD "1234567"

#define DATABASE_URL  "https://veyin-a371e-default-rtdb.asia-southeast1.firebasedatabase.app"

// =====================================================
// 3. KONFIGURASI SENSOR DHT
// =====================================================
#define DHT_PIN 4

#define DHT_TYPE DHT11

DHT dht(DHT_PIN, DHT_TYPE);

// =====================================================
// 4. KONFIGURASI RELAY
// =====================================================
#define RELAY_1 14
#define RELAY_2 27
#define RELAY_3 26
#define RELAY_4 25

// Banyak modul relay memakai active LOW.
// Artinya LOW = ON, HIGH = OFF.
#define RELAY_ON LOW
#define RELAY_OFF HIGH

int relayPins[4] = {
  RELAY_1,
  RELAY_2,
  RELAY_3,
  RELAY_4
};

bool relayState[4] = {
  false,
  false,
  false,
  false
};

// =====================================================
// 5. KONFIGURASI WAKTU NTP
// =====================================================
// GMT+7 Indonesia Barat
const long gmtOffset_sec = 7 * 3600;
const int daylightOffset_sec = 0;

// =====================================================
// 6. OBJEK FIREBASE
// =====================================================
UserAuth userAuth(API_KEY, USER_EMAIL, USER_PASSWORD);

FirebaseApp app;
RealtimeDatabase Database;

WiFiClientSecure sslClient;

using AsyncClient = AsyncClientClass;
AsyncClient asyncClient(sslClient);

// =====================================================
// 7. VARIABEL SISTEM
// =====================================================
bool statusSudahDikirim = false;

unsigned long lastSensorSend = 0;
const unsigned long sensorInterval = 3000;

unsigned long lastDeviceUpdate = 0;
const unsigned long deviceUpdateInterval = 10000;

unsigned long lastRelayRead = 0;
const unsigned long relayReadInterval = 500;

unsigned long lastModeRead = 0;
const unsigned long modeReadInterval = 700;

// =====================================================
// 8. VARIABEL MODE LAMPU
// =====================================================
String currentMode = "NORMAL";
bool modeActive = false;

unsigned long lastModeStep = 0;
const unsigned long modeStepInterval = 300;

int modeIndex = 0;
bool stroboState = false;

// =====================================================
// 9. CALLBACK HASIL FIREBASE
// =====================================================
void processData(AsyncResult &result) {
  if (!result.isResult()) {
    return;
  }

  if (result.isEvent()) {
    Serial.printf(
      "Event: %s | Pesan: %s | Kode: %d\n",
      result.uid().c_str(),
      result.eventLog().message().c_str(),
      result.eventLog().code()
    );
  }

  if (result.isDebug()) {
    Serial.printf(
      "Debug: %s | Pesan: %s\n",
      result.uid().c_str(),
      result.debug().c_str()
    );
  }

  if (result.isError()) {
    Serial.printf(
      "Error: %s | Pesan: %s | Kode: %d\n",
      result.uid().c_str(),
      result.error().message().c_str(),
      result.error().code()
    );
  }

  if (result.available()) {
    Serial.printf(
      "Berhasil: %s | Hasil: %s\n",
      result.uid().c_str(),
      result.c_str()
    );
  }
}

// =====================================================
// 10. FUNGSI TIMESTAMP
// =====================================================
String getTimestampISO() {
  struct tm timeinfo;

  if (!getLocalTime(&timeinfo)) {
    return String(millis());
  }

  char buffer[30];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%S+07:00", &timeinfo);

  return String(buffer);
}

// =====================================================
// 11. FUNGSI DASAR RELAY
// =====================================================
void setRelayHardware(int index, bool state) {
  if (index < 0 || index > 3) return;

  relayState[index] = state;

  if (state) {
    digitalWrite(relayPins[index], RELAY_ON);
  } else {
    digitalWrite(relayPins[index], RELAY_OFF);
  }
}

void matikanSemuaRelay() {
  for (int i = 0; i < 4; i++) {
    setRelayHardware(i, false);
  }
}

void nyalakanSemuaRelay() {
  for (int i = 0; i < 4; i++) {
    setRelayHardware(i, true);
  }
}

void applyRelayStates() {
  for (int i = 0; i < 4; i++) {
    if (relayState[i]) {
      digitalWrite(relayPins[i], RELAY_ON);
    } else {
      digitalWrite(relayPins[i], RELAY_OFF);
    }
  }
}

// =====================================================
// 12. FUNGSI MODE KIRI-KANAN
// =====================================================
void jalankanModeKiriKanan() {
  if (millis() - lastModeStep < modeStepInterval) {
    return;
  }

  lastModeStep = millis();

  matikanSemuaRelay();

  int step = modeIndex;

  if (step == 0) setRelayHardware(0, true);
  if (step == 1) setRelayHardware(1, true);
  if (step == 2) setRelayHardware(2, true);
  if (step == 3) setRelayHardware(3, true);
  if (step == 4) setRelayHardware(2, true);
  if (step == 5) setRelayHardware(1, true);

  modeIndex++;

  if (modeIndex > 5) {
    modeIndex = 0;
  }
}

// =====================================================
// 13. FUNGSI MODE STROBO
// =====================================================
void jalankanModeStrobo() {
  if (millis() - lastModeStep < modeStepInterval) {
    return;
  }

  lastModeStep = millis();

  stroboState = !stroboState;

  if (stroboState) {
    nyalakanSemuaRelay();
  } else {
    matikanSemuaRelay();
  }
}

// =====================================================
// 14. FUNGSI JALANKAN MODE
// =====================================================
void jalankanModeLampu() {
  if (!modeActive || currentMode == "NORMAL") {
    return;
  }

  if (currentMode == "KIRI_KANAN") {
    jalankanModeKiriKanan();
  } else if (currentMode == "STROBO") {
    jalankanModeStrobo();
  }
}

// =====================================================
// 15. FUNGSI KONEKSI WIFI
// =====================================================
void koneksiWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Menghubungkan ke WiFi");

  unsigned long waktuMulai = millis();

  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);

    if (millis() - waktuMulai > 30000) {
      Serial.println();
      Serial.println("Gagal terhubung ke WiFi.");
      Serial.println("Periksa SSID dan password WiFi.");
      return;
    }
  }

  Serial.println();
  Serial.println("WiFi berhasil terhubung.");
  Serial.print("IP ESP32: ");
  Serial.println(WiFi.localIP());
}

// =====================================================
// 16. FUNGSI KIRIM STATUS DEVICE
// =====================================================
void kirimStatusDevice() {
  String ipAddress = WiFi.localIP().toString();
  String timestamp = getTimestampISO();

  Serial.println("Mengirim status device ke Firebase...");

  Database.set<String>(
    asyncClient,
    "/device/status",
    "online",
    processData,
    "setDeviceStatus"
  );

  Database.set<String>(
    asyncClient,
    "/device/ipAddress",
    ipAddress,
    processData,
    "setDeviceIP"
  );

  Database.set<String>(
    asyncClient,
    "/device/lastSeen",
    timestamp,
    processData,
    "setDeviceLastSeen"
  );
}

// =====================================================
// 17. FUNGSI KIRIM DATA SENSOR
// =====================================================
void kirimDataSensor() {
  float suhu = dht.readTemperature();
  float kelembapan = dht.readHumidity();

  if (isnan(suhu) || isnan(kelembapan)) {
    Serial.println("Gagal membaca sensor DHT!");
    return;
  }

  String timestamp = getTimestampISO();

  Serial.println("------------------------------------");
  Serial.print("Suhu       : ");
  Serial.print(suhu);
  Serial.println(" °C");

  Serial.print("Kelembapan : ");
  Serial.print(kelembapan);
  Serial.println(" %");

  Serial.print("Update     : ");
  Serial.println(timestamp);

  Database.set<float>(
    asyncClient,
    "/sensor/temperature",
    suhu,
    processData,
    "setTemperature"
  );

  Database.set<float>(
    asyncClient,
    "/sensor/humidity",
    kelembapan,
    processData,
    "setHumidity"
  );

  Database.set<String>(
    asyncClient,
    "/sensor/lastUpdate",
    timestamp,
    processData,
    "setSensorLastUpdate"
  );
}

// =====================================================
// 18. FUNGSI BACA STATUS RELAY DARI FIREBASE
// =====================================================
void bacaRelayFirebase() {
  bool r1 = Database.get<bool>(asyncClient, "/relay/relay1");
  bool r2 = Database.get<bool>(asyncClient, "/relay/relay2");
  bool r3 = Database.get<bool>(asyncClient, "/relay/relay3");
  bool r4 = Database.get<bool>(asyncClient, "/relay/relay4");

  // Relay manual hanya diterapkan jika mode tidak aktif
  if (!modeActive || currentMode == "NORMAL") {
    setRelayHardware(0, r1);
    setRelayHardware(1, r2);
    setRelayHardware(2, r3);
    setRelayHardware(3, r4);
  }
}


// =====================================================
// 19. FUNGSI BACA MODE DARI FIREBASE
// =====================================================
void bacaModeFirebase() {
  String modeName = Database.get<String>(asyncClient, "/mode/name");
  bool active = Database.get<bool>(asyncClient, "/mode/active");

  // Jika mode kosong, anggap NORMAL
  if (modeName == "" || modeName == "null") {
    modeName = "NORMAL";
  }

  if (modeName != currentMode || active != modeActive) {
    Serial.println("------------------------------------");
    Serial.print("Mode berubah: ");
    Serial.print(modeName);
    Serial.print(" | Active: ");
    Serial.println(active ? "true" : "false");

    currentMode = modeName;
    modeActive = active;

    modeIndex = 0;
    stroboState = false;
    lastModeStep = 0;

    if (!modeActive || currentMode == "NORMAL") {
      matikanSemuaRelay();
    }
  }
}

// =====================================================
// 20. SETUP
// =====================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("====================================");
  Serial.println("ESP32 + FIREBASE + DHT + 4 RELAY");
  Serial.println("====================================");

  dht.begin();

  for (int i = 0; i < 4; i++) {
    pinMode(relayPins[i], OUTPUT);
    digitalWrite(relayPins[i], RELAY_OFF);
  }

  koneksiWiFi();

  configTime(gmtOffset_sec, daylightOffset_sec, "pool.ntp.org", "time.google.com");

  Serial.println("Menunggu sinkronisasi waktu...");
  delay(2000);

  sslClient.setInsecure();
  sslClient.setConnectionTimeout(10000);
  sslClient.setHandshakeTimeout(10);

  Serial.println("Memulai autentikasi Firebase...");

  initializeApp(
    asyncClient,
    app,
    getAuth(userAuth),
    processData,
    "authTask"
  );

  app.getApp<RealtimeDatabase>(Database);
  Database.url(DATABASE_URL);
}

// =====================================================
// 21. LOOP
// =====================================================
void loop() {
  app.loop();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi terputus. Menghubungkan ulang...");
    koneksiWiFi();
  }

  if (app.ready() && !statusSudahDikirim) {
    statusSudahDikirim = true;

    Serial.println();
    Serial.println("Firebase siap.");
    kirimStatusDevice();
  }

  if (app.ready()) {
    if (millis() - lastDeviceUpdate >= deviceUpdateInterval) {
      lastDeviceUpdate = millis();
      kirimStatusDevice();
    }

    if (millis() - lastSensorSend >= sensorInterval) {
      lastSensorSend = millis();
      kirimDataSensor();
    }

    if (millis() - lastModeRead >= modeReadInterval) {
      lastModeRead = millis();
      bacaModeFirebase();
    }

    if (millis() - lastRelayRead >= relayReadInterval) {
      lastRelayRead = millis();
      bacaRelayFirebase();
    }

    jalankanModeLampu();
  }
}
