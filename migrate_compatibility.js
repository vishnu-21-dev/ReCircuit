const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const compatibilityMap = {
  // Samsung Smartphones
  "Galaxy S24": ["Galaxy S23", "Galaxy S24 Plus"],
  "Galaxy S23": ["Galaxy S24", "Galaxy S22", "Galaxy S23 Plus"],
  "Galaxy S22": ["Galaxy S21", "Galaxy S23"],
  "Galaxy S21 FE": ["Galaxy S21", "Galaxy A52"],
  "Galaxy A54": ["Galaxy A53", "Galaxy A34"],
  "Galaxy A34": ["Galaxy A54", "Galaxy A33", "Galaxy A14"],
  "Galaxy A14": ["Galaxy A13", "Galaxy A34", "Galaxy M14"],
  "Galaxy M34": ["Galaxy M33", "Galaxy A34", "Galaxy M14"],
  "Galaxy M14": ["Galaxy A14", "Galaxy M13", "Galaxy M34"],
  "Galaxy F54": ["Galaxy M54", "Galaxy F34"],

  // Apple iPhones
  "iPhone 15": ["iPhone 15 Plus", "iPhone 14"],
  "iPhone 15 Pro": ["iPhone 15 Pro Max", "iPhone 14 Pro"],
  "iPhone 14": ["iPhone 14 Plus", "iPhone 15", "iPhone 13"],
  "iPhone 14 Pro": ["iPhone 14 Pro Max", "iPhone 15 Pro", "iPhone 13 Pro"],
  "iPhone 13": ["iPhone 13 Mini", "iPhone 14", "iPhone 12"],
  "iPhone 13 Pro": ["iPhone 13 Pro Max", "iPhone 14 Pro", "iPhone 12 Pro"],
  "iPhone 12": ["iPhone 12 Mini", "iPhone 13", "iPhone 11"],
  "iPhone 11": ["iPhone 11 Pro", "iPhone 12", "iPhone XR"],
  "iPhone SE 3rd Gen": ["iPhone SE 2nd Gen", "iPhone 8"],
  "iPhone XR": ["iPhone XS", "iPhone 11"],

  // OnePlus
  "OnePlus 12": ["OnePlus 11", "OnePlus 12R"],
  "OnePlus 11": ["OnePlus 12", "OnePlus 10 Pro"],
  "OnePlus Nord 3": ["OnePlus Nord 2T", "OnePlus Nord CE 3"],
  "OnePlus Nord CE 3": ["OnePlus Nord 3", "OnePlus Nord CE 2"],
  "OnePlus Nord 2T": ["OnePlus Nord 3", "OnePlus Nord CE 3"],
  "OnePlus 10 Pro": ["OnePlus 11", "OnePlus 9 Pro"],
  "OnePlus 10T": ["OnePlus 10 Pro", "OnePlus 9 Pro"],
  "OnePlus 9 Pro": ["OnePlus 10 Pro", "OnePlus 10T"],

  // Xiaomi / Redmi / Poco
  "Redmi Note 13 Pro": ["Redmi Note 12 Pro", "Poco X6 Pro"],
  "Redmi Note 13": ["Redmi Note 12", "Poco M6 Pro"],
  "Redmi Note 12 Pro": ["Redmi Note 13 Pro", "Poco X5 Pro"],
  "Redmi Note 12": ["Redmi Note 13", "Redmi Note 11"],
  "Redmi 13C": ["Redmi 12C", "Redmi A2 Plus"],
  "Poco X6 Pro": ["Redmi Note 13 Pro", "Poco X5 Pro"],
  "Poco X6": ["Poco X5", "Redmi Note 13"],
  "Poco M6 Pro": ["Redmi Note 13", "Poco M5 Pro"],
  "Mi 11X Pro": ["Mi 11X", "Poco F3"],

  // Realme
  "Realme 12 Pro": ["Realme 11 Pro", "Realme 12 Pro Plus"],
  "Realme 12": ["Realme 11", "Realme Narzo 60"],
  "Realme Narzo 60 Pro": ["Realme 11 Pro", "Realme 12 Pro"],
  "Realme Narzo 60": ["Realme 12", "Realme C67"],
  "Realme 11 Pro": ["Realme 12 Pro", "Realme Narzo 60 Pro"],
  "Realme C67": ["Realme C55", "Realme Narzo 60"],
  "Realme C55": ["Realme C67", "Realme C35"],

  // Vivo
  "Vivo V30 Pro": ["Vivo V29 Pro", "Vivo V30"],
  "Vivo V30": ["Vivo V30 Pro", "Vivo V29"],
  "Vivo V29 Pro": ["Vivo V30 Pro", "Vivo V27 Pro"],
  "Vivo V27 Pro": ["Vivo V29 Pro", "Vivo V25 Pro"],
  "Vivo Y100": ["Vivo Y56", "Vivo Y75"],
  "Vivo Y56": ["Vivo Y100", "Vivo Y35"],
  "Vivo T2 Pro": ["Vivo T1 Pro", "Vivo V27"],

  // Oppo
  "Oppo Reno 11 Pro": ["Oppo Reno 10 Pro", "Oppo Reno 11"],
  "Oppo Reno 11": ["Oppo Reno 11 Pro", "Oppo Reno 10"],
  "Oppo Reno 10 Pro": ["Oppo Reno 11 Pro", "Oppo Reno 8 Pro"],
  "Oppo F25 Pro": ["Oppo F23", "Oppo Reno 11"],
  "Oppo F23": ["Oppo F25 Pro", "Oppo A79"],
  "Oppo A79": ["Oppo A78", "Oppo F23"],
  "Oppo A58": ["Oppo A57", "Oppo A78"],

  // Motorola
  "Moto G84": ["Moto G73", "Moto G54"],
  "Moto G54": ["Moto G84", "Moto G34"],
  "Moto G34": ["Moto G54", "Moto G24"],
  "Moto Edge 40 Pro": ["Moto Edge 40", "Moto Edge 30 Pro"],
  "Moto Edge 40": ["Moto Edge 40 Pro", "Moto Edge 30"],
  "Moto G73": ["Moto G84", "Moto G53"],
  "Moto G53": ["Moto G73", "Moto G32"],

  // Laptops - Lenovo
  "IdeaPad Slim 5": ["IdeaPad Slim 3", "IdeaPad Gaming 3"],
  "IdeaPad Slim 3": ["IdeaPad Slim 5", "IdeaPad 3"],
  "IdeaPad Gaming 3": ["IdeaPad Slim 5", "LOQ 15", "Legion 5i"],
  "LOQ 15": ["IdeaPad Gaming 3", "Legion 5 Pro"],
  "Legion 5 Pro": ["Legion 5i", "LOQ 15"],
  "Legion 5i": ["Legion 5 Pro", "IdeaPad Gaming 3"],
  "ThinkPad E14": ["ThinkPad E15", "ThinkPad L14"],
  "ThinkPad X1 Carbon": ["ThinkPad X1 Yoga", "ThinkPad T14s"],

  // Laptops - Dell
  "Inspiron 15 3520": ["Inspiron 14", "Vostro 15"],
  "Inspiron 14": ["Inspiron 15 3520", "Vostro 14"],
  "Vostro 15": ["Inspiron 15 3520", "Vostro 14"],
  "G15 Gaming": ["Alienware m16", "Inspiron 15 3520"],
  "XPS 13": ["XPS 15", "XPS 13 Plus"],
  "XPS 15": ["XPS 13", "XPS 17"],

  // Laptops - HP
  "Pavilion 15": ["HP 15s", "Victus 16"],
  "HP 15s": ["Pavilion 15", "Laptop 15s-eq"],
  "Victus 16": ["Omen 16", "Pavilion 15"],
  "Omen 16": ["Victus 16", "Omen 17"],
  "Envy x360": ["Spectre x360", "Pavilion x360"],
  "Spectre x360": ["Envy x360", "EliteBook x360"],

  // Laptops - Asus
  "VivoBook 15": ["VivoBook 14", "ZenBook 14"],
  "ZenBook 14": ["VivoBook 15", "ZenBook 13"],
  "TUF Gaming A15": ["TUF Gaming F15", "ROG Strix G15"],
  "TUF Gaming F15": ["TUF Gaming A15", "ROG Strix G15"],
  "ROG Strix G15": ["TUF Gaming A15", "ROG Zephyrus G14"],
  "ROG Zephyrus G14": ["ROG Strix G15", "TUF Gaming A15"],

  // Laptops - Acer
  "Aspire 5": ["Aspire 7", "Swift 3"],
  "Aspire 7": ["Aspire 5", "Nitro 5"],
  "Nitro 5": ["Predator Helios 300", "Aspire 7", "Nitro V"],
  "Nitro V": ["Nitro 5", "Aspire 7"],
  "Predator Helios 300": ["Predator Helios Neo", "Nitro 5"],
  "Predator Helios Neo": ["Predator Helios 300", "Nitro 5"],

  // Home Appliances - Samsung Washing Machines
  "Front Load WM 7kg": ["Front Load WM 8kg"],
  "Front Load WM 8kg": ["Front Load WM 7kg"],
  "Top Load WM 6.5kg": ["Top Load WM 7kg"],
  "Top Load WM 7kg": ["Top Load WM 6.5kg", "Top Load WM 7.5kg"],
  "Top Load WM 7.5kg": ["Top Load WM 7kg"],

  // Home Appliances - Fridges
  "Double Door Fridge 253L": ["Double Door Fridge 235L", "Double Door Fridge 260L"],
  "Double Door Fridge 235L": ["Double Door Fridge 253L", "Double Door Fridge 258L"],
  "Double Door Fridge 260L": ["Double Door Fridge 253L", "Double Door Fridge 258L"],
  "Double Door Fridge 258L": ["Double Door Fridge 260L", "Double Door Fridge 235L"],
  "Single Door Fridge 192L": ["Single Door Fridge 184L", "Single Door Fridge 190L"],
  "Single Door Fridge 184L": ["Single Door Fridge 192L", "Single Door Fridge 190L"],
  "Single Door Fridge 190L": ["Single Door Fridge 184L", "Single Door Fridge 192L"],

  // Home Appliances - ACs
  "1.5 Ton Split AC": ["1 Ton Split AC", "2 Ton Split AC"],
  "1 Ton Split AC": ["1.5 Ton Split AC", "1 Ton Inverter AC"],
  "2 Ton Split AC": ["1.5 Ton Split AC", "1.5 Ton Inverter AC"],
  "1.5 Ton Inverter AC": ["1.5 Ton Split AC", "1 Ton Inverter AC"],
  "1 Ton Inverter AC": ["1 Ton Split AC", "1.5 Ton Inverter AC"],
  "1.5 Ton Window AC": ["1.5 Ton Split AC"],

  // TVs
  "QLED TV 55\"": ["QLED TV 65\"", "Crystal 4K TV 55\""],
  "OLED TV 65\"": ["OLED C3 65\"", "Bravia XR A80L OLED"],
  "OLED C3 55\"": ["OLED C3 65\"", "QLED TV 55\""],
  "Bravia XR A80L OLED": ["OLED TV 65\"", "OLED C3 65\""],
  "Bravia X90L 55\"": ["Bravia X75L 43\"", "NanoCell TV 55\""],
  "NanoCell TV 55\"": ["Bravia X90L 55\"", "QLED TV 55\""],
};

async function migrate() {
    let count = 0;
    try {
        // Handle document IDs properly: Firestore doc IDs have constraints, 
        // especially '/' but our data doesn't have slashes. Still, safe to replace them.
        for (const [model, compatibleWith] of Object.entries(compatibilityMap)) {
            const docId = model.replace(/\//g, "-");
            await db.collection("compatibility").doc(docId).set({
                compatibleWith: compatibleWith
            });
            count++;
        }
        console.log(`Successfully migrated ${count} compatibility mapping documents.`);
        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    }
}

migrate();
