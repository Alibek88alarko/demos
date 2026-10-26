// RC522 tag reader: prints one line per tag presentation.
// Wiring (Arduino Uno / Nano, SPI):
//   RC522 SDA  -> D10
//   RC522 SCK  -> D13
//   RC522 MOSI -> D11
//   RC522 MISO -> D12
//   RC522 IRQ  -> not connected
//   RC522 GND  -> GND
//   RC522 RST  -> D9
//   RC522 3.3V -> 3.3V   (never 5V)
// Library: "MFRC522" by GithubCommunity (Arduino IDE -> Library Manager).

#include <SPI.h>
#include <MFRC522.h>

#define SS_PIN 10
#define RST_PIN 9

MFRC522 reader(SS_PIN, RST_PIN);

void setup() {
  Serial.begin(115200);
  SPI.begin();
  reader.PCD_Init();
  delay(50);
  Serial.println("READY");
}

void loop() {
  if (!reader.PICC_IsNewCardPresent()) return;
  if (!reader.PICC_ReadCardSerial()) return;

  Serial.print("UID:");
  for (byte i = 0; i < reader.uid.size; i++) {
    if (reader.uid.uidByte[i] < 0x10) Serial.print("0");
    Serial.print(reader.uid.uidByte[i], HEX);
  }
  Serial.println();

  // Halt the card so it is not re-read while it stays on the antenna.
  // The host still de-duplicates by time window: a real UHF reader
  // reports the same tag many times per second.
  reader.PICC_HaltA();
  reader.PCD_StopCrypto1();
  delay(150);
}
