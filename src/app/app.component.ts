import { Component } from '@angular/core';
import { BigNumber, ethers } from 'ethers';
import tokenJsonInterface  from '../assets/MyToken.json';
import tokenizedBallotJsonInterface  from '../assets/TokenizedBallot.json';
import { HttpClient } from '@angular/common/http';

const ERC20_VOTES_ADDRESS = "0x5d58b610645A88329Df027D7159B6869Ab110dC0"; //put in BE now
const BALLOT_CONTRACT_ADDRESS = "0x35FA3459df6951874bB3f9Af9839baAE1737596a";
//JC212's addresses:
//const TOKENIZED_BALLOT_CONTRACT = '0xb55dFf80EB5B2813061Be67da8C681cdC139EACc';
//const VOTE_TOKEN_CONTRACT = '0x8474E404fB31e0b3a94E0e570e3f75E69052a792';

const ALCHEMY_API_KEY="MwLDDsXrUc33uY_JtGf7si7uJbd0cyQy";
const ETHERSCAN_API_KEY="14KQ8F8MHK4JDKYIVAMEJDCWF88MYIHZ8J";

declare global {
  interface Window {
    ethereum: any
  }
}
//const interface
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  wallet: ethers.Wallet | undefined;
  connectedMetaMaskSigner: ethers.providers.JsonRpcSigner | undefined; //MetaMask wallets aren't really Wallets, not sure how to connect to them yet
  provider: ethers.providers.BaseProvider | undefined;
  etherBalance: number | undefined = 0;
  tokenContract: ethers.Contract | undefined;
  tokenContractAddress: string | undefined;  
  tokenBalance: number | undefined = 0;
  votePower: number | undefined = 0;
  ballotContract: ethers.Contract | undefined;
  ballotContractAddress: string | undefined;

  constructor(private http: HttpClient){}

  async createWallet() {
    this.provider = ethers.getDefaultProvider("goerli", {alchemy: ALCHEMY_API_KEY, etherscan: ETHERSCAN_API_KEY});
    this.wallet = ethers.Wallet.createRandom().connect(this.provider); //
    //console.log("create random wallet, pub key: "+ this.wallet.publicKey); //
    //console.log("create random wallet, priv key: "+ this.wallet.privateKey); //if you want to re-import later
    /*this.http.get<{result: string}>("http://localhost:3000/token-address").subscribe((ans)=>{//not a Promise, returns Observable 
      console.log(ans.result);
      this.tokenContractAddress = ans.result;

      this.updateBlockchainInfo();
      setInterval( this.updateBlockchainInfo.bind(this), 5000);
    });*/
    this.tokenContractAddress = ERC20_VOTES_ADDRESS;
    this.ballotContractAddress = BALLOT_CONTRACT_ADDRESS;
    this.tokenContract = new ethers.Contract( ERC20_VOTES_ADDRESS, tokenJsonInterface.abi, this.wallet); //note: for these this.provider works for read-only calls, but write calls like delegate need a real signer
    this.ballotContract = new ethers.Contract( BALLOT_CONTRACT_ADDRESS , tokenizedBallotJsonInterface.abi, this.wallet); //could be hardcoded vs returning from API


    /*
    //testing out this method to loop over a solidity array until it goes out-of-bounds error vs adding a length param to the contract
    const solidityPublicArrayToJsArray = async<T = any>(contract: ethers.Contract, arrayName: string) => {
      let err: Error| undefined = undefined;
      let array: T[] = [];
      while (err === undefined) {
        try {
          const item = await contract[arrayName](array.length) as T;
          array.push(item);
        } catch (e) {
          err = e as Error;
        }
      }
      return array;
    }
    const arr = await solidityPublicArrayToJsArray(this.tokenContract, "proposals");
    console.log(arr);
    */
    //const proposals = this.tokenContract['proposals']().then((ans:string)=>{
    //  console.log(ans);
    //});
    const proposal = await this.tokenContract['proposals'][0].name;
    console.log(proposal);

    this.updateBlockchainInfo();
    setInterval( this.updateBlockchainInfo.bind(this), 5000);
  }

  //TODO: not sure how to get this to work
  async connectWallet(){
    const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    // Prompt user for account connections
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const connected_account_addr = await signer.getAddress();
    console.log("Account:", connected_account_addr);

    this.connectedMetaMaskSigner = signer;

    
    this.provider = provider; //ethers.getDefaultProvider("goerli", {alchemy: ALCHEMY_API_KEY, etherscan: ETHERSCAN_API_KEY});
    //this.wallet = ethers.Wallet.createRandom().connect(this.provider); //
    //this.wallet = new ethers.Wallet(signer);
    this.tokenContractAddress = ERC20_VOTES_ADDRESS;
    this.ballotContractAddress = BALLOT_CONTRACT_ADDRESS;
    this.tokenContract = new ethers.Contract( ERC20_VOTES_ADDRESS, tokenJsonInterface.abi, this.wallet);
    this.ballotContract = new ethers.Contract( BALLOT_CONTRACT_ADDRESS , tokenizedBallotJsonInterface.abi, this.wallet); //could be hardcoded vs returning from API

    this.updateBlockchainInfo();
    setInterval( this.updateBlockchainInfo.bind(this), 5000);
  }
  updateBlockchainInfo() {
    console.log('update');
    //console.log(this.tokenContractAddress);
    //console.log(this.wallet);
    if( this.tokenContract && this.wallet) {
      //console.log('inside update');
      //this.tokenContract = new ethers.Contract(this.tokenContractAddress, tokenJsonInterface.abi, this.provider);
      this.tokenContract["balanceOf"](this.wallet.address).then((tokenBalanceBigNumber:BigNumber)=>{
        console.log( tokenBalanceBigNumber );
        console.log( ethers.utils.formatEther(tokenBalanceBigNumber) );
        this.tokenBalance = parseFloat( ethers.utils.formatEther(tokenBalanceBigNumber) );
      });
      this.tokenContract["getVotes"](this.wallet.address).then((votePowerBigNumber:BigNumber)=>{
        this.votePower = parseFloat( ethers.utils.formatEther(votePowerBigNumber) ); // add 5 votes to cheat if you want initially
      });
      this.wallet.getBalance().then( (balanceBigNumber) => {
        this.etherBalance = parseFloat( ethers.utils.formatEther(balanceBigNumber) );
        console.log( balanceBigNumber );
        console.log( ethers.utils.formatEther(balanceBigNumber) );
      });
    }
  }
  vote(voteId: number|string, votePowerToUse: number|string){ //well it comes over as a string
    //const vote_id_int = parseInt(voteId);
    if (typeof voteId == 'string') voteId = parseInt(voteId);
    if (typeof votePowerToUse == 'string') votePowerToUse = parseInt(votePowerToUse);

    console.log("voting for proposal:"+ voteId + "with power: "+ votePowerToUse);
    if( this.ballotContract && this.wallet) {    
      //TODO: take this.ballotContract['vote'](voteId) //need to import the ballotJson at the top to do this
      this.ballotContract["vote"]( voteId, votePowerToUse ).then(()=>{
        console.log('is voting done?');
      });
    }
  }
  async delegate(){
    //if(this.tokenContractAddress) {
      //this.tokenContract = new ethers.Contract(this.tokenContractAddress, tokenJsonInterface.abi, this.provider);
      if(this.tokenContract && this.wallet) { //hmmm compiler seems to want this
        console.log("need to delegate to yourself:"+ this.wallet.address )
        console.log("contract address"+ this.tokenContract.address+ ", this contracts signer: "+ (await this.tokenContract.signer.getAddress()) );
        this.tokenContract["delegate"]( this.wallet.address ).then(()=>{
          console.log('is delegation done?');
        });
      }
    //}
  }
  requestTokens(){
    //pass name id ?
    this.http.post<any>('http://localhost:3000/request-tokens', {address: this.wallet?.address} ).subscribe( (ans)=>{//not a Promise, returns Observable 
      console.log(ans);
      return ans;
    });
  }

  importWallet(){
    //TODO
  }

  winningProposal(){
    //TODO
  }

  /*
  title = 'my-fe-app';
  someText = 'SomeText';
  lastBlockNumber: string | number | undefined = 'loading...';
  counter: number = 0

  clickMe() {
    this.counter++;
  }
  constructor() {
    ethers.providers.getDefaultProvider('goerli').getBlock('latest').then(
      (block) => {
        this.lastBlockNumber = block.number;
      }
    );
  }
  */
}
