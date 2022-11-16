const { expect } = require('chai');
const { ethers } = require('hardhat');

const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const {   BN, expectRevert } = require('@openzeppelin/test-helpers');
const expectEvent = require('@openzeppelin/test-helpers/src/expectEvent');
const utils_1 = ethers.utils;//require("ethers/utils");
// import UniswapV2Pair from '../build/UniswapV2Pair.json'

// import UniswapV2Pair from "artifacts/contracts/UniswapPair.sol/UniswapPair.json"

const ether = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}
const wei = (n) => {
    return ethers.utils.parseUnits(n.toString(), 'wei')
}
const overrides = {
  gasLimit: 9999999
}
let c_WETH9, c_Token01, c_Token02, c_UniswapV2Router02, c_UniswapPair, c_UniswapFactory
let deployer, spender, user2, users

async function createPair(tokens) {
    const bytecode = UniswapV2Pair.bytecode;  //`0x${UniswapV2Pair.evm.bytecode.object}`
    console.log('----------bytecode------------')
    console.log(ethers.utils.keccak256(bytecode))
    const create2Address = getCreate2Address(c_UniswapFactory.address, tokens, bytecode)
    await expect(c_UniswapFactory.createPair(...tokens))
        .to.emit(c_UniswapFactory, 'PairCreated')
        .withArgs(tokens[0], tokens[1], create2Address, wei(1))

    await expect(c_UniswapFactory.createPair(...tokens)).to.be.reverted // UniswapV2: PAIR_EXISTS
    await expect(c_UniswapFactory.createPair(...tokens.slice().reverse())).to.be.reverted // UniswapV2: PAIR_EXISTS
    expect(await c_UniswapFactory.getPair(...tokens)).to.eq(create2Address)
    expect(await c_UniswapFactory.getPair(...tokens.slice().reverse())).to.eq(create2Address)
    expect(await c_UniswapFactory.allPairs(0)).to.eq(create2Address)
    expect(await c_UniswapFactory.allPairsLength()).to.eq(1) 

// -----------------------
    const TransferHelper = await ethers.getContractFactory("TransferHelper");
    const l_TransferHelper = await TransferHelper.deploy();
    await l_TransferHelper.deployed();

    const UniswapV2Library = await ethers.getContractFactory("UniswapV2Library");
    const l_UniswapV2Library = await UniswapV2Library.deploy();
    await l_UniswapV2Library.deployed();
    const pp = await l_UniswapV2Library.pairFor(c_UniswapFactory.address, tokens[0], tokens[1]);
    expect(create2Address).to.eq(pp)

}

async function myPrepare(){
    const WETH9 = await ethers.getContractFactory('ERC20Token')
    c_Token01 = await WETH9.deploy('Token0', 'TK0', ether(10000))
    await c_Token01.deployed()

    c_Token02 = await WETH9.deploy('Token1', 'TK1', ether(10000))
    await c_Token02.deployed()

    const UniswapFactory = await ethers.getContractFactory('UniswapFactory')
    c_UniswapFactory = await UniswapFactory.deploy()
    UniswapV2Pair = await ethers.getContractFactory('UniswapPair')
    // console.log(UniswapV2Pair)
}

function getCreate2Address(factoryAddress, _a, bytecode) {
    var tokenA = _a[0], tokenB = _a[1];
    var _b = tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA], token0 = _b[0], token1 = _b[1];
    console.log(utils_1.keccak256(bytecode))
    var create2Inputs = [
        '0xff',
        factoryAddress,
        utils_1.keccak256(utils_1.solidityPack(['address', 'address'], [token0, token1])),
        utils_1.keccak256(bytecode)
    ];
    var sanitizedInputs = "0x" + create2Inputs.map(function (i) { return i.slice(2); }).join('');
    return utils_1.getAddress("0x" + utils_1.keccak256(sanitizedInputs).slice(-40));
}

describe('factory', () => {
    beforeEach(async () => {
      [deployer, spender, user2, ...users] = await ethers.getSigners();
      await loadFixture(myPrepare)
    })
    describe('transfer from owner to user2', async () => {
        it('token names', async function() {
            await createPair([c_Token01.address, c_Token02.address])
        })
    })
})