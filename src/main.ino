#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <GyverMAX7219.h>
#include <ArduinoJson.h>

const char* ssid = "your_wifi";
const char* password = "your_password";

const char* mqtt_server = "broker.emqx.io";
const int mqtt_port = 1883;
const char* topic = "led/matrix";

WiFiClient espClient;
PubSubClient client(espClient);

// матрица 1x1 на пине 5
MAX7219<1, 1, 5> mtrx;

// Переменные для бегущей строки
String scrollText = "";
int scrollX = 8;
bool scrolling = false;
unsigned long scrollTimer = 0;
const int scrollSpeed = 100; // скорость скролла

void setup_wifi() {
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(500);
}

void callback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }

  Serial.print("Received message: ");
  Serial.println(msg);

  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, msg);
  
  if (err) {
    Serial.print("JSON parse error: ");
    Serial.println(err.c_str());
    return;
  }

  String mode = doc["mode"];
  String data = doc["payload"];

  Serial.print("Mode: ");
  Serial.println(mode);
  Serial.print("Data: ");
  Serial.println(data);

  // Обработка в зависимости от режима
  if (mode == "text") {
    scrollText = data;
    scrollX = 8;
    scrolling = true;
    Serial.println("Text mode activated");
  } 
  else if (mode == "emoji") {
    scrolling = false;
    mtrx.clear();

    if (data.length() != 64) {
      Serial.println("Error: emoji string is not 64 bits");
      return;
    }

    for (int y = 0; y < 8; y++) {
      byte row = 0;
      for (int x = 0; x < 8; x++) {
        char bitChar = data[y * 8 + x];
        if (bitChar == '1') bitSet(row, 7 - x);
      }
      for (int x = 0; x < 8; x++) {
        bool pixel = bitRead(row, 7 - x);
        mtrx.dot(x, y, pixel);
      }
    }
    mtrx.update();
    Serial.println("Emoji displayed");
  } 
  else if (mode == "custom") {
    scrolling = false;
    mtrx.clear();
    
    if (data.length() != 64) {
      Serial.println("Error: custom string is not 64 bits");
      return;
    }

    for (int y = 0; y < 8; y++) {
      byte row = 0;
      for (int x = 0; x < 8; x++) {
        if (data[y * 8 + x] == '1') {
          bitSet(row, 7 - x);
        }
      }
      for (int x = 0; x < 8; x++) {
        bool pixel = bitRead(row, 7 - x);
        mtrx.dot(x, y, pixel);
      }
    }
    mtrx.update();
    Serial.println("Custom pattern displayed");
  }
}

void reconnect() {
  while (!client.connected()) {
    if (client.connect("ESPMatrixClient")) {
      client.subscribe(topic);
    } else {
      delay(1000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  mtrx.begin();
  mtrx.setBright(5);
  mtrx.textDisplayMode(true);
  mtrx.setScale(1);
  mtrx.clear();
  mtrx.update();

  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  // Бегущая строка
  if (scrolling && millis() - scrollTimer >= scrollSpeed) {
    scrollTimer = millis();

    mtrx.clear();
    mtrx.setCursor(scrollX, 0);
    mtrx.print(scrollText);
    mtrx.update();

    scrollX--;

    int textLength = scrollText.length() * 6;
    if (scrollX < -textLength) {
      scrollX = 8;  // повтор анимации 
    }
  }
}
