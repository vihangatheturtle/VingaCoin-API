// CosmosCoin API

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const SHA256 = require('crypto-js/sha256');
const bp = require('body-parser');

const packageData = require('./package.json');
const app = express();
const port = 31823;

app.use(bp.json())
app.use(bp.urlencoded({ extended: true }))

class CryptoBlock{
    constructor(index, data, precedingHash=" ", dataOverride=false){
	if (!dataOverride) {
     this.index = index;
     this.timestamp = Date.now().toString();
     this.data = data;
     this.precedingHash = precedingHash;
     this.hash = this.computeHash();
	 this.nonce = 0;
	} else {
	 this.index = data.index;
     this.timestamp = data.timestamp;
     this.data = data.data;
     this.precedingHash = data.precedingHash;
     this.hash = data.hash;
	 this.nonce = data.nonce;
	}
    }
    computeHash(){
        return SHA256(this.index + this.precedingHash + this.timestamp + JSON.stringify(this.data)+this.nonce).toString();
    }
	proofOfWork(difficulty){
		while(this.hash.substring(0, difficulty) !==Array(difficulty + 1).join("0")){
			this.nonce++;
		    this.hash = this.computeHash();
	    }
	}
}

class CryptoBlockchain{
    constructor(){
        this.blockchain = [this.startGenesisBlock()];
		this.difficulty = mineDiff;
    }
    startGenesisBlock(){
        return new CryptoBlock(0, "Initial Block in the Chain", "0");
    }
    obtainLatestBlock(){
        return this.blockchain[this.blockchain.length - 1];
    }
    addNewBlock(newBlock){
        newBlock.precedingHash = this.obtainLatestBlock().hash;
        newBlock.proofOfWork(this.difficulty);
        this.blockchain.push(newBlock);
    }
	addNewBlockRaw(newBlock){
        this.blockchain.push(newBlock);
    }
	checkChainValidity(){
        for(let i = 1; i < this.blockchain.length; i++){
            const currentBlock = this.blockchain[i];
            const precedingBlock= this.blockchain[i-1];

          if(currentBlock.hash !== currentBlock.computeHash()){
              return false;
          }
          if(currentBlock.precedingHash !== precedingBlock.hash)
            return false;
        }
        return true;
    }
}

var mineDiff = 4;
var nodeData = {};
let CosmosCoin = new CryptoBlockchain();
let tempCoin = new CryptoBlockchain();
tempCoin.blockchain[0] = CosmosCoin.blockchain[0];

function makeid(length) {
    var result           = [];
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result.push(characters.charAt(Math.floor(Math.random() * 
 charactersLength)));
   }
   return result.join('');
}

function splHalf(str) {
	let half = Math.floor(str.length / 2);
	return [str.slice(0, half), str.slice(half, str.length)]
}

app.post('/nodes/register-new-node', function(req, res) {
	var uuid = uuidv4();
	var mnspl = splHalf(req.headers["machinename"]);
	req.headers["machinename"] = "csms" + makeid(8) + mnspl[0] + makeid(8) + mnspl[1] + makeid(8) + "node";
	try {
		nodeData[uuid] = {"machineName":req.headers["machinename"],"uuid":uuid};
	} catch {
		res.json({"error":true,"message":"Invalid machinename"});
		return;
	}
	res.json({"error":false,"message":nodeData[uuid]});
});

var blckMine = false;

app.post('/mine/publish/block', function(req, res) {
	if (!blckMine) {
		blckMine = true;
		tempCoin.addNewBlockRaw(new CryptoBlock(1, req.body, req.body["precedingHash"], true));
		if (!tempCoin.checkChainValidity()) {
			tempCoin = new CryptoBlockchain();
			for (i=0; i<CosmosCoin.blockchain.length; i++) {
				tempCoin.blockchain[i] = CosmosCoin.blockchain[i];
			}
			res.send('invalidBlock');
		} else {
			CosmosCoin.addNewBlockRaw(new CryptoBlock(1, req.body, req.body["precedingHash"], true));
			if (CosmosCoin.checkChainValidity()) {
				console.log('block mined');
				res.send('validBlock');
			}
		}
		blckMine = false;
	} else {
		res.send('blockInProcess');
	}
});

app.get('/mine/genesis', function(req, res) {
	res.send(JSON.stringify(CosmosCoin["blockchain"][0]));
});

app.get('/mine/bchain', function(req, res) {
	function reply() {
		setTimeout(() => {
			if (!blckMine) {
				res.send(JSON.stringify(CosmosCoin, null, 4));
				return;
			} else {
				reply();
			}
		}, 500);
	}
	
	reply();
});

app.get('/mine/diff', function(req, res) {
	res.send(mineDiff.toString());
});

app.get('/nodes/node-list', function(req, res) {
	res.send(nodeData);
});

app.get('/', function(req, res) {
	res.send(`CosmosCoin Official API, version ${packageData["version"]}`);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})