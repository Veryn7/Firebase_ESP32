const firebaseConfig = {
  apiKey: "",
  authDomain: "veyin-a371e.firebaseapp.com",
  databaseURL: "https://veyin-a371e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "veyin-a371e",
  storageBucket: "veyin-a371e.firebasestorage.app",
  messagingSenderId: "1020110832896",
  appId: "1:1020110832896:web:3df47613828c27042edfe5",
  measurementId: "G-R44NKNW126"
};

{
  "project_title": "Pengembangan Sistem Kendali IoT Multi-Broker dengan Integrasi Perintah Suara",
  "role": "Kamu adalah AI web developer profesional yang ahli membuat dashboard IoT modern menggunakan HTML, CSS, JavaScript, Three.js, MQTT.js, dan Firebase Authentication.",
  "main_instruction": "Buatkan website dashboard IoT modern, responsif, interaktif, dan memiliki animasi 3D menggunakan Three.js. Website digunakan untuk memantau suhu dan kelembapan dari sensor DHT11/DHT22, mengontrol 4 relay melalui 3 MQTT broker berbeda, menampilkan voice command dengan visual spectrum 3D, serta memiliki sistem login dan logout menggunakan Firebase Authentication.",
  "technology_stack": {
    "frontend": [
      "HTML",
      "CSS",
      "JavaScript"
    ],
    "3d_library": "Three.js",
    "mqtt_library": "MQTT.js CDN",
    "voice_feature": "Web Speech API",
    "authentication": "Firebase Authentication",
    "database_optional": "Firebase Realtime Database atau Firestore untuk menyimpan konfigurasi MQTT dan log jika diperlukan",
    "deployment_target": "Firebase Hosting"
  },
  "hardware_system": {
    "microcontroller": "ESP32 DevKit V1",
    "sensor": "DHT11 atau DHT22",
    "actuator": "4 relay atau 4 lampu",
    "connectivity": "WiFi dan MQTT",
    "mqtt_brokers_used": [
      "MyQttHub",
      "Cedalo MQTT",
      "CrystalMQ"
    ]
  },
  "authentication_requirements": {
    "use_firebase_authentication": true,
    "login_methods": [
      "Email dan Password"
    ],
    "required_pages": [
      "Login Page",
      "Dashboard Page"
    ],
    "login_page_features": [
      "Form email",
      "Form password",
      "Tombol login",
      "Tombol register akun baru",
      "Validasi input kosong",
      "Pesan error jika login gagal",
      "Redirect otomatis ke dashboard jika login berhasil"
    ],
    "dashboard_auth_features": [
      "Cek status user login",
      "Jika belum login, redirect ke halaman login",
      "Topbar menampilkan email akun yang sedang login",
      "Sidebar menampilkan akun yang login",
      "Menu logout pada sidebar",
      "Ketika logout berhasil, user diarahkan kembali ke halaman login"
    ]
  },
  "layout_requirements": {
    "main_layout": "Admin dashboard modern dengan topbar, sidebar, dan content area",
    "topbar": {
      "features": [
        "Menampilkan judul aplikasi",
        "Menampilkan tombol buka/tutup sidebar",
        "Menampilkan email akun yang sedang login",
        "Menampilkan status koneksi MQTT secara ringkas",
        "Desain modern dan responsif"
      ]
    },
    "sidebar": {
      "features": [
        "Sidebar bisa dibuka dan ditutup",
        "Memiliki animasi transisi saat dibuka dan ditutup",
        "Menampilkan profil akun login",
        "Menampilkan menu navigasi",
        "Menampilkan tombol logout"
      ],
      "menu_items": [
        {
          "name": "Dashboard",
          "submenus": [
            "Voice",
            "Suhu",
            "Kelembapan"
          ]
        },
        {
          "name": "Setting",
          "submenus": [
            "Konfigurasi MQTT"
          ]
        },
        {
          "name": "Static",
          "submenus": [
            "Data Suhu",
            "Data Kelembapan",
            "Log MQTT"
          ]
        },
        {
          "name": "Kontrol",
          "submenus": [
            "Kontrol Relay"
          ]
        },
        {
          "name": "Logout",
          "action": "Keluar dari akun Firebase Authentication"
        }
      ]
    },
    "content_area": {
      "features": [
        "Menampilkan konten berdasarkan menu yang dipilih",
        "Tanpa reload halaman",
        "Gunakan single page application sederhana menggunakan JavaScript",
        "Responsif untuk desktop dan mobile"
      ]
    }
  },
  "dashboard_menu_requirements": {
    "dashboard_voice": {
      "title": "Voice Command",
      "features": [
        "Tombol mulai mendengarkan suara",
        "Tombol berhenti mendengarkan suara",
        "Menampilkan teks hasil suara pengguna",
        "Mengirim perintah suara ke MQTT topic voice command",
        "Menampilkan visual spectrum 3D menggunakan Three.js",
        "Spectrum bergerak mengikuti status voice command atau simulasi audio input",
        "Gunakan Web Speech API dengan bahasa Indonesia id-ID"
      ],
      "threejs_spectrum_requirements": [
        "Buat canvas Three.js khusus untuk voice spectrum",
        "Gunakan bentuk bar spectrum 3D atau gelombang audio 3D",
        "Animasi spectrum aktif saat voice recognition berjalan",
        "Spectrum meredup atau berhenti saat voice recognition berhenti"
      ]
    },
    "dashboard_suhu": {
      "title": "Monitoring Suhu",
      "features": [
        "Menampilkan nilai suhu realtime dari MQTT",
        "Menampilkan satuan derajat Celsius",
        "Menampilkan emoticon 3D menggunakan Three.js Geometry",
        "Emoticon berubah berdasarkan angka suhu",
        "Warna dan ekspresi emoticon berubah sesuai kondisi suhu"
      ],
      "temperature_emoticon_logic": [
        {
          "condition": "temperature < 25",
          "status": "Dingin",
          "emoticon": "Wajah dingin atau menggigil",
          "color": "Biru",
          "animation": "Bergetar pelan"
        },
        {
          "condition": "temperature >= 25 && temperature <= 30",
          "status": "Normal",
          "emoticon": "Wajah senyum",
          "color": "Hijau",
          "animation": "Berputar pelan"
        },
        {
          "condition": "temperature > 30 && temperature <= 35",
          "status": "Panas",
          "emoticon": "Wajah kepanasan",
          "color": "Oranye",
          "animation": "Berputar lebih cepat"
        },
        {
          "condition": "temperature > 35",
          "status": "Sangat Panas",
          "emoticon": "Wajah sangat panas atau merah",
          "color": "Merah",
          "animation": "Bergetar cepat"
        }
      ]
    },
    "dashboard_kelembapan": {
      "title": "Monitoring Kelembapan",
      "features": [
        "Menampilkan nilai kelembapan realtime dari MQTT",
        "Menampilkan satuan persen",
        "Menampilkan emoticon 3D menggunakan Three.js Geometry",
        "Emoticon berubah berdasarkan angka kelembapan",
        "Warna dan ekspresi emoticon berubah sesuai kondisi kelembapan"
      ],
      "humidity_emoticon_logic": [
        {
          "condition": "humidity < 40",
          "status": "Kering",
          "emoticon": "Wajah kering atau kurang nyaman",
          "color": "Kuning",
          "animation": "Berputar lambat"
        },
        {
          "condition": "humidity >= 40 && humidity <= 70",
          "status": "Normal",
          "emoticon": "Wajah senyum",
          "color": "Hijau",
          "animation": "Berputar stabil"
        },
        {
          "condition": "humidity > 70",
          "status": "Lembap",
          "emoticon": "Wajah berkeringat atau basah",
          "color": "Biru muda",
          "animation": "Gelombang naik turun"
        }
      ]
    }
  },
  "setting_menu_requirements": {
    "mqtt_configuration": {
      "title": "Konfigurasi MQTT",
      "features": [
        "Form konfigurasi untuk 3 MQTT broker",
        "Input host atau WebSocket URL broker",
        "Input port broker",
        "Input username broker",
        "Input password broker",
        "Input client ID",
        "Input base topic",
        "Tombol simpan konfigurasi",
        "Tombol test koneksi broker",
        "Tombol reset konfigurasi",
        "Konfigurasi disimpan di localStorage",
        "Jangan hardcode password asli di source code"
      ],
      "broker_forms": [
        {
          "broker_name": "MyQttHub",
          "fields": [
            "WebSocket URL",
            "Port",
            "Username",
            "Password",
            "Client ID"
          ]
        },
        {
          "broker_name": "Cedalo MQTT",
          "fields": [
            "WebSocket URL",
            "Port",
            "Username",
            "Password",
            "Client ID"
          ]
        },
        {
          "broker_name": "CrystalMQ",
          "fields": [
            "WebSocket URL",
            "Port",
            "Username",
            "Password",
            "Client ID"
          ]
        }
      ]
    }
  },
  "static_menu_requirements": {
    "data_suhu": {
      "title": "Data Suhu",
      "features": [
        "Menampilkan tabel riwayat suhu",
        "Menampilkan waktu data diterima",
        "Menampilkan broker asal data",
        "Menampilkan nilai suhu",
        "Menyediakan tombol hapus data lokal"
      ]
    },
    "data_kelembapan": {
      "title": "Data Kelembapan",
      "features": [
        "Menampilkan tabel riwayat kelembapan",
        "Menampilkan waktu data diterima",
        "Menampilkan broker asal data",
        "Menampilkan nilai kelembapan",
        "Menyediakan tombol hapus data lokal"
      ]
    },
    "log_mqtt": {
      "title": "Log MQTT",
      "features": [
        "Menampilkan semua aktivitas MQTT",
        "Log koneksi broker",
        "Log publish",
        "Log subscribe",
        "Log error koneksi",
        "Log perintah relay",
        "Log perintah suara",
        "Menyediakan tombol clear log"
      ]
    }
  },
  "kontrol_menu_requirements": {
    "kontrol_relay": {
      "title": "Kontrol Relay",
      "features": [
        "Menampilkan 4 card relay",
        "Setiap relay memiliki tombol ON dan OFF",
        "Setiap relay menampilkan status ON atau OFF",
        "Tombol nyalakan semua relay",
        "Tombol matikan semua relay",
        "Tombol Variasi 1",
        "Tombol Variasi 2",
        "Semua perintah relay dipublish ke 3 MQTT broker sekaligus",
        "Status relay diperbarui dari topic MQTT state"
      ],
      "relay_list": [
        "Relay 1",
        "Relay 2",
        "Relay 3",
        "Relay 4"
      ],
      "relay_variations": [
        {
          "name": "VARIASI1",
          "description": "Relay menyala bergantian dari kiri ke kanan: Relay 1, Relay 2, Relay 3, Relay 4"
        },
        {
          "name": "VARIASI2",
          "description": "Semua relay berkedip bersama seperti efek strobe"
        }
      ]
    }
  },
  "mqtt_brokers": [
    {
      "name": "MyQttHub",
      "type": "MQTT Broker 1",
      "websocket_url_placeholder": "wss://ISI_WEBSOCKET_MYQTTHUB",
      "username_placeholder": "ISI_USERNAME_MYQTTHUB",
      "password_placeholder": "ISI_PASSWORD_MYQTTHUB",
      "client_id_placeholder": "web_myqtthub_${random_id}"
    },
    {
      "name": "Cedalo MQTT",
      "type": "MQTT Broker 2",
      "websocket_url_placeholder": "wss://ISI_WEBSOCKET_CEDALO",
      "username_placeholder": "ISI_USERNAME_CEDALO",
      "password_placeholder": "ISI_PASSWORD_CEDALO",
      "client_id_placeholder": "web_cedalo_${random_id}"
    },
    {
      "name": "CrystalMQ",
      "type": "MQTT Broker 3",
      "websocket_url_placeholder": "wss://ISI_WEBSOCKET_CRYSTALMQ",
      "username_placeholder": "ISI_USERNAME_CRYSTALMQ",
      "password_placeholder": "ISI_PASSWORD_CRYSTALMQ",
      "client_id_placeholder": "web_crystalmq_${random_id}"
    }
  ],
  "mqtt_base_topic": "gusliyanza/iot-multibroker",
  "mqtt_topics": {
    "sensor": "gusliyanza/iot-multibroker/sensor",
    "relay_set": [
      "gusliyanza/iot-multibroker/relay/1/set",
      "gusliyanza/iot-multibroker/relay/2/set",
      "gusliyanza/iot-multibroker/relay/3/set",
      "gusliyanza/iot-multibroker/relay/4/set"
    ],
    "relay_state": [
      "gusliyanza/iot-multibroker/relay/1/state",
      "gusliyanza/iot-multibroker/relay/2/state",
      "gusliyanza/iot-multibroker/relay/3/state",
      "gusliyanza/iot-multibroker/relay/4/state"
    ],
    "mode_set": "gusliyanza/iot-multibroker/mode/set",
    "voice_command": "gusliyanza/iot-multibroker/voice/cmd",
    "system_log": "gusliyanza/iot-multibroker/log"
  },
  "mqtt_payload_format": {
    "sensor_payload_example": {
      "temperature": 30.5,
      "humidity": 72.1,
      "timestamp": "2026-06-05 04:00:00"
    },
    "relay_payload": [
      "ON",
      "OFF"
    ],
    "mode_payload": [
      "VARIASI1",
      "VARIASI2"
    ],
    "voice_payload_examples": [
      "nyalakan relay 1",
      "matikan relay 1",
      "nyalakan relay 2",
      "matikan relay 2",
      "nyalakan relay 3",
      "matikan relay 3",
      "nyalakan relay 4",
      "matikan relay 4",
      "nyalakan semua relay",
      "matikan semua relay",
      "jalankan variasi 1",
      "jalankan variasi 2",
      "baca suhu",
      "baca kelembapan"
    ]
  },
  "voice_command_requirements": {
    "language": "id-ID",
    "use_web_speech_api": true,
    "features": [
      "Mengenali perintah suara bahasa Indonesia",
      "Menampilkan teks hasil suara pada dashboard",
      "Mengirim hasil suara ke topic voice command di 3 broker MQTT",
      "Memberikan feedback visual ketika mendengarkan suara",
      "Menggunakan Three.js spectrum sebagai visualisasi suara"
    ],
    "command_mapping": [
      {
        "spoken_text": "nyalakan relay 1",
        "mqtt_topic": "gusliyanza/iot-multibroker/relay/1/set",
        "payload": "ON"
      },
      {
        "spoken_text": "matikan relay 1",
        "mqtt_topic": "gusliyanza/iot-multibroker/relay/1/set",
        "payload": "OFF"
      },
      {
        "spoken_text": "nyalakan semua relay",
        "mqtt_action": "Publish ON ke semua relay"
      },
      {
        "spoken_text": "matikan semua relay",
        "mqtt_action": "Publish OFF ke semua relay"
      },
      {
        "spoken_text": "jalankan variasi 1",
        "mqtt_topic": "gusliyanza/iot-multibroker/mode/set",
        "payload": "VARIASI1"
      },
      {
        "spoken_text": "jalankan variasi 2",
        "mqtt_topic": "gusliyanza/iot-multibroker/mode/set",
        "payload": "VARIASI2"
      },
      {
        "spoken_text": "baca suhu",
        "action": "Website membacakan nilai suhu terakhir menggunakan SpeechSynthesis API"
      },
      {
        "spoken_text": "baca kelembapan",
        "action": "Website membacakan nilai kelembapan terakhir menggunakan SpeechSynthesis API"
      }
    ]
  },
  "threejs_requirements": {
    "temperature_geometry": {
      "description": "Gunakan Three.js untuk membuat emoticon 3D suhu yang berubah berdasarkan nilai suhu.",
      "objects": [
        "SphereGeometry untuk wajah",
        "Geometry kecil untuk mata",
        "Curve atau Torus untuk mulut",
        "Partikel kecil untuk efek panas atau dingin"
      ],
      "behavior": [
        "Objek bisa diputar menggunakan mouse",
        "Objek otomatis berputar pelan",
        "Ekspresi berubah berdasarkan suhu",
        "Warna berubah berdasarkan suhu"
      ]
    },
    "humidity_geometry": {
      "description": "Gunakan Three.js untuk membuat emoticon 3D kelembapan yang berubah berdasarkan nilai kelembapan.",
      "objects": [
        "SphereGeometry untuk wajah",
        "Droplet geometry atau bentuk tetesan air",
        "Partikel air untuk kondisi lembap"
      ],
      "behavior": [
        "Objek bisa diputar menggunakan mouse",
        "Objek otomatis bergerak naik turun",
        "Ekspresi berubah berdasarkan kelembapan",
        "Warna berubah berdasarkan kelembapan"
      ]
    },
    "voice_spectrum": {
      "description": "Gunakan Three.js untuk membuat spectrum audio 3D pada menu Voice.",
      "objects": [
        "Bar spectrum 3D",
        "Gelombang berbentuk lingkaran",
        "Partikel bergerak saat voice recognition aktif"
      ],
      "behavior": [
        "Spectrum aktif saat user menekan tombol mulai voice",
        "Spectrum bergerak mengikuti simulasi intensitas suara",
        "Spectrum berhenti atau mengecil saat voice dimatikan"
      ]
    }
  },
  "ui_design_requirements": {
    "theme": "Modern dark IoT dashboard",
    "color_style": [
      "Dark navy",
      "Blue accent",
      "Green accent",
      "Glassmorphism card",
      "Neon glow untuk status aktif"
    ],
    "responsive": true,
    "mobile_friendly": true,
    "components": [
      "Login page",
      "Topbar",
      "Collapsible sidebar",
      "Dashboard content",
      "3D suhu card",
      "3D kelembapan card",
      "3D voice spectrum card",
      "MQTT setting form",
      "Relay control card",
      "Data table suhu",
      "Data table kelembapan",
      "Log MQTT panel"
    ]
  },
  "logic_requirements": {
    "connect_to_all_brokers": true,
    "publish_to_all_brokers": true,
    "subscribe_to_all_brokers": true,
    "handle_reconnect": true,
    "show_connection_status": true,
    "parse_sensor_json": true,
    "update_temperature_realtime": true,
    "update_humidity_realtime": true,
    "update_threejs_emoticon_realtime": true,
    "update_relay_status_realtime": true,
    "save_mqtt_config_to_localStorage": true,
    "save_temperature_history_to_localStorage": true,
    "save_humidity_history_to_localStorage": true,
    "save_mqtt_log_to_localStorage": true
  },
  "file_structure": {
    "generate_files": [
      {
        "filename": "index.html",
        "description": "Halaman utama dashboard setelah login"
      },
      {
        "filename": "login.html",
        "description": "Halaman login dan register Firebase Authentication"
      },
      {
        "filename": "style.css",
        "description": "Style dashboard, login page, topbar, sidebar, card, table, dan responsive design"
      },
      {
        "filename": "firebase-config.js",
        "description": "Konfigurasi Firebase Authentication menggunakan placeholder"
      },
      {
        "filename": "mqtt-config.js",
        "description": "Konfigurasi default MQTT broker menggunakan placeholder dan localStorage"
      },
      {
        "filename": "app.js",
        "description": "Logic utama dashboard, navigasi menu, sidebar, MQTT, relay, data, log, dan voice command"
      },
      {
        "filename": "three-scene.js",
        "description": "Logic Three.js untuk emoticon suhu, emoticon kelembapan, dan voice spectrum"
      }
    ],
    "code_style": [
      "Kode harus rapi",
      "Kode diberi komentar penjelasan",
      "Gunakan nama variabel yang mudah dipahami",
      "Jangan hardcode password asli",
      "Gunakan placeholder untuk Firebase dan MQTT"
    ]
  },
  "firebase_config_placeholder": {
    "apiKey": "ISI_FIREBASE_API_KEY",
    "authDomain": "ISI_FIREBASE_AUTH_DOMAIN",
    "projectId": "ISI_FIREBASE_PROJECT_ID",
    "storageBucket": "ISI_FIREBASE_STORAGE_BUCKET",
    "messagingSenderId": "ISI_FIREBASE_MESSAGING_SENDER_ID",
    "appId": "ISI_FIREBASE_APP_ID"
  },
  "important_notes": [
    "Website harus menggunakan MQTT over WebSocket atau WSS karena browser tidak bisa langsung menggunakan MQTT TCP port 1883.",
    "Jika salah satu broker tidak mendukung WebSocket, tetap buat struktur konfigurasi agar bisa diisi dengan WSS broker atau backend bridge.",
    "Semua password MQTT dan Firebase config gunakan placeholder.",
    "Website harus bisa dijalankan sebagai static web dan siap dihosting di Firebase Hosting.",
    "Pastikan menu sidebar bisa dibuka dan ditutup.",
    "Pastikan topbar menampilkan akun yang sedang login.",
    "Pastikan logout Firebase tersedia di sidebar.",
    "Pastikan suhu dan kelembapan memiliki visual emoticon 3D berbeda sesuai nilai angka.",
    "Pastikan voice command memiliki visual spectrum 3D."
  ],
  "final_request": "Buatkan kode lengkap untuk seluruh file berdasarkan spesifikasi JSON ini. Pastikan website memiliki login dan logout Firebase Authentication, topbar akun login, sidebar buka tutup, menu Dashboard untuk Voice/Suhu/Kelembapan, menu Setting untuk konfigurasi MQTT, menu Static untuk data suhu/kelembapan/log, menu Kontrol untuk relay, animasi Three.js untuk emoticon suhu dan kelembapan, serta Three.js spectrum untuk voice command."
}
