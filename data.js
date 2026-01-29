var globalProductIdCounter = 0;
var stores = null;


class Store{
  constructor(name, image){
    this.name = name;
    this.image = image;
    this.Products = [];
  }

  addProduct(product){
    this.Products.push(product);
  }

  deleteProduct(productID){
    let index = this.Products.findIndex(item => item.id == productID);
    if(index > -1){
      this.Products.splice(index, 1);
    }
  }
}

class Product{
  constructor(name, image, price){
    this.name = name;
    this.image = image;
    this.price = price;
    this.ratings = [];  //just an array of numbers 1-5
    this.avgRating = 0; //calculated and set whenever a new rating is inserted above
    this.id = globalProductIdCounter++;
  }

  modify(action, value){
    switch(action){     //expected values: name, image, price
      case 'name':
        this.name = value;
        break;
      case 'image':
        this.image = value;
        break;
      case 'price':
        this.price = value;
        break;
      default:
        console.log('unable to modify product ' + this.name + ' with action ' + action);
        break;
    }
  }
  
  rate(rating){
    this.ratings.push(rating);
    let sum = 0;
    for(let i = 0; i < this.ratings.length; ++i){
      sum += this.ratings[i];
    }
    this.avgRating = sum / this.ratings.length;
  }
}

const DB_NAME = "store-db";
const DB_VERSION = 2;
const STORE_STORE = "stores";
const META_STORE = "meta";


function generatePlaceholder(){
  globalProductIdCounter = 0;
  const store = new Store("Demo Store", "BASE64-PH");
  const p1 = new Product("Demo Product A", "BASE64-PH", 9.99);
  const p2 = new Product("Demo Product B", "BASE64-PH", 14.99);
  store.addProduct(p1);
  store.addProduct(p2);
  return [store];
}

function openDB(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_STORE)) {
        db.createObjectStore(STORE_STORE, { keyPath: "name" });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function initStores(){
  openDB().then(db => {
    const tx = db.transaction([STORE_STORE, META_STORE], "readwrite");
    const storeOS = tx.objectStore(STORE_STORE);
    const metaOS = tx.objectStore(META_STORE);

    const storesReq = storeOS.getAll();
    const counterReq = metaOS.get("globalProductIdCounter");

    let storesResult = null;
    let counterResult = null;

    storesReq.onsuccess = () => {
      storesResult = storesReq.result;
      maybeFinish();
    };
    counterReq.onsuccess = () => {  // yes theres 2, no i don't know why
      counterResult = counterReq.result;
      maybeFinish();
    };

    function maybeFinish(){
      if (storesResult === null || counterResult === null) return;

      if (counterResult) globalProductIdCounter = counterResult.value;
      else globalProductIdCounter = 0;

      if (storesResult.length === 0) {
        storesResult = generatePlaceholder();
        storesResult.forEach(s => storeOS.put(s));
        metaOS.put({
          key: "globalProductIdCounter",
          value: globalProductIdCounter
        });
      }

      stores = storesResult;
      
      if(typeof onDataReady === "function") onDataReady();
    }
  });
}

function saveStores(stores){
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_STORE, META_STORE], "readwrite");
      const storeOS = tx.objectStore(STORE_STORE);
      const metaOS = tx.objectStore(META_STORE);

      stores.forEach(s => storeOS.put(s));
      metaOS.put({ key: "globalProductIdCounter", value: globalProductIdCounter });

      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  });
}

initStores();
