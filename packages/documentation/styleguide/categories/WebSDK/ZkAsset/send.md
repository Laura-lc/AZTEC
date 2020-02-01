## Examples
### Confidentially send value of 30units to another Ethereum address
```js
// Enable the SDK
const apiKey = '7FJF5YK-WV1M90Y-G25V2MW-FG2ZMDV';
await window.aztec.enable({ apiKey });

// Fetch the zkAsset
const address = '0x00408e1Ae7F5E590FAed44aE2cee5a9C23CA683d';
const asset = await window.aztec.zkAsset(address);
console.info({ asset });

// Deposit funds into the ZkAsset
const addressToDeposit = '0xD4CD0b1EF54E8E4D73f68b01b5ccc125b13E3d1e';
const depositAmount = 50;
await asset.deposit(
  [
    {
      addressToDeposit,
      amount: depositAmount,
    }
  ]
  {},
);

// Send funds
const addressToSend = '0x228bd0d0ec5396ceaffcc2c5299d21f17d14207c';
const sendAmount = 30;
await asset.send([
  {
    addressToSend,
    amount: sendAmount,
  }
], {})
```