const { expect } = require('chai');
const { ethers } = require('hardhat');

const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const {   BN, expectRevert } = require('@openzeppelin/test-helpers');
const expectEvent = require('@openzeppelin/test-helpers/src/expectEvent');
const utils_1 = ethers.utils;
const {MaxUint256} = ethers.constants;

const ether = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}
const wei = (n) => {
    return ethers.utils.parseUnits(n.toString(), 'wei')
}
const bn = wei
const overrides = {
  gasLimit: 9999999
}


async function deployERC20Token(name,symbol, ownerBalance){
    const ERC20Token = await ethers.getContractFactory('ERC20Token')
    const c_ERC20Token = await ERC20Token.deploy(name, symbol, ownerBalance)
    await c_ERC20Token.deployed()
    return c_ERC20Token
}


async function deployContract(contractName, constructorArgs) {
    return ethers
      .getContractFactory(contractName)
      .then((contract) => contract.deploy(...constructorArgs))
      .then((contract) => contract.deployed()) 
  }

describe("SushiBar按股份分红", function () {
  let vestingToken
  let SushiBar
  let owner
  let alice
  let bob
  let carol

  before(async function () {
    const signers = await ethers.getSigners()
    owner = signers[0]
    alice = signers[4]
    bob = signers[5]
    carol = signers[6]
  })

  beforeEach(async function () {
    vestingToken = await deployERC20Token("FidelioDuetto", "FidelioDuettoBPT", bn(10_000))
    SushiBar = await deployContract("SushiBar", [vestingToken.address])
  })

  it("正确设置初始状态", async () => {
    expect(await SushiBar.vestingToken()).to.equal(vestingToken.address)
  })

  it("如果尚未锁定代币，则铸造正确数量的 股本", async () => {
    const enterAmount = bn(100)
    // bob初始化100个币
    await vestingToken.transfer(bob.address, enterAmount)
    //授权给bar
    await vestingToken.connect(bob).approve(SushiBar.address, enterAmount)
    //bob 把vest代币锁定在bar里面
    await expect(SushiBar.connect(bob).enter(enterAmount)).to.emit(SushiBar, "Enter").withArgs(bob.address, enterAmount, enterAmount)
    //bar的vest代币数量应该等于bob锁定的数量
    expect(await vestingToken.balanceOf(SushiBar.address)).to.equal(enterAmount)
    //bob的bar凭证应该等于锁定的代币数量
    expect(await SushiBar.balanceOf(bob.address)).to.equal(enterAmount)
  })

  it("如果已经锁定代币而 股本 值没有增加，则铸造正确数量的 股本", async () => {
    const aliceEnterAmount = bn(50)
    await vestingToken.transfer(alice.address, aliceEnterAmount)

    const bobEnterAmount = bn(100)
    await vestingToken.transfer(bob.address, bobEnterAmount)

    await vestingToken.connect(alice).approve(SushiBar.address, aliceEnterAmount)
    await expect(SushiBar.connect(alice).enter(aliceEnterAmount))
      .to.emit(SushiBar, "Enter")
      .withArgs(alice.address, aliceEnterAmount, aliceEnterAmount)

    await vestingToken.connect(bob).approve(SushiBar.address, bobEnterAmount)
    await expect(SushiBar.connect(bob).enter(bobEnterAmount)).to.emit(SushiBar, "Enter").withArgs(bob.address, bobEnterAmount, bobEnterAmount)

    expect(await vestingToken.balanceOf(SushiBar.address)).to.equal(aliceEnterAmount.add(bobEnterAmount))
    expect(await SushiBar.balanceOf(alice.address)).to.equal(aliceEnterAmount)
    expect(await SushiBar.balanceOf(bob.address)).to.equal(bobEnterAmount)
  })

  it("在股本增加后铸造正确数量的股份", async () => {
    const aliceEnterAmount = bn(100)
    await vestingToken.transfer(alice.address, aliceEnterAmount)

    const bobEnterAmount = bn(100)
    await vestingToken.transfer(bob.address, bobEnterAmount)

    await vestingToken.connect(alice).approve(SushiBar.address, aliceEnterAmount)
    // alice被sushibar骗了，投资了100块
    await expect(SushiBar.connect(alice).enter(aliceEnterAmount))
      .to.emit(SushiBar, "Enter")
      .withArgs(alice.address, aliceEnterAmount, aliceEnterAmount)
    
    // 没想到sushibar赚钱了，所以给股东分红100快！
    const valueIncreaseAmount = bn(100)
    await vestingToken.approve(SushiBar.address, valueIncreaseAmount)
    await expect(SushiBar.shareRevenue(valueIncreaseAmount)).to.emit(SushiBar, "ShareRevenue").withArgs(valueIncreaseAmount)
    //股本变成200块

    // 现在bob来接盘了，投资了100块，但是由于总股本是200，所以bob只能买到原始股的一半，也就是50块
    await vestingToken.connect(bob).approve(SushiBar.address, bobEnterAmount)
    await expect(SushiBar.connect(bob).enter(bobEnterAmount))
      .to.emit(SushiBar, "Enter")
      .withArgs(bob.address, bobEnterAmount, bobEnterAmount.div(2))

    expect(await vestingToken.balanceOf(SushiBar.address)).to.equal(aliceEnterAmount.add(bobEnterAmount).add(valueIncreaseAmount))
    expect(await SushiBar.balanceOf(alice.address)).to.equal(aliceEnterAmount)
    expect(await SushiBar.balanceOf(bob.address)).to.equal(bobEnterAmount.div(2))
  })

  it("在 股本 增值后转移正确数量的归属代币", async () => {
    const aliceEnterAmount = bn(100)
    await vestingToken.transfer(alice.address, aliceEnterAmount)

    const bobEnterAmount = bn(100)
    await vestingToken.transfer(bob.address, bobEnterAmount)

    await vestingToken.connect(alice).approve(SushiBar.address, aliceEnterAmount)
    const expectedAliceFreshSushiAmount = aliceEnterAmount
    await expect(SushiBar.connect(alice).enter(aliceEnterAmount))
      .to.emit(SushiBar, "Enter")
      .withArgs(alice.address, aliceEnterAmount, expectedAliceFreshSushiAmount)

    // lets double the value of fSushi

    const firstValueIncrease = bn(100)
    await vestingToken.approve(SushiBar.address, firstValueIncrease)
    await expect(SushiBar.shareRevenue(firstValueIncrease)).to.emit(SushiBar, "ShareRevenue").withArgs(firstValueIncrease)

    // now bob enters, so his share is now only half of the one of alice
    await vestingToken.connect(bob).approve(SushiBar.address, bobEnterAmount)
    const expectedBobFreshSushiAmount = bobEnterAmount.div(2)
    await expect(SushiBar.connect(bob).enter(bobEnterAmount))
      .to.emit(SushiBar, "Enter")
      .withArgs(bob.address, bobEnterAmount, expectedBobFreshSushiAmount)

    // lets add another 100 fSushi

    const secondValueIncrease = bn(100)

    await vestingToken.approve(SushiBar.address, secondValueIncrease)
    await expect(SushiBar.shareRevenue(secondValueIncrease)).to.emit(SushiBar, "ShareRevenue").withArgs(secondValueIncrease)

    expect(await vestingToken.balanceOf(SushiBar.address)).to.equal(
      aliceEnterAmount.add(bobEnterAmount).add(firstValueIncrease).add(secondValueIncrease)
    )

    /*
       amount = fSushi *  totalVestedTokens / total_fSushi;

       so we left with alice first:
        alice_amount = 100 * 400 / 150 = 266.666

       then bob:
        bob_amount = 50 * (400 - 266.666) / 50 = 133.333
     */

    const fSushiSupplyBeforeAliceLeave = await SushiBar.totalSupply()
    const lockedFidelioTokensBeforeAliceLeave = await vestingToken.balanceOf(SushiBar.address)
    const aliceAmount = await SushiBar.balanceOf(alice.address)
    const expectedAliceLeaveLpAmount = aliceAmount.mul(lockedFidelioTokensBeforeAliceLeave).div(fSushiSupplyBeforeAliceLeave)

    await expect(SushiBar.connect(alice).leave(aliceAmount))
      .to.emit(SushiBar, "Leave")
      .withArgs(alice.address, expectedAliceLeaveLpAmount, expectedAliceFreshSushiAmount)

    expect(await vestingToken.balanceOf(alice.address)).to.equal(expectedAliceLeaveLpAmount)

    const fSushiSupplyBeforeBobLeave = await SushiBar.totalSupply()
    const lockedFidelioTokensBeforeBobLeave = await vestingToken.balanceOf(SushiBar.address)
    const bobAmount = await SushiBar.balanceOf(bob.address)
    const expectedBobLeaveLpAmount = bobAmount.mul(lockedFidelioTokensBeforeBobLeave).div(fSushiSupplyBeforeBobLeave)
    await expect(SushiBar.connect(bob).leave(bobAmount))
      .to.emit(SushiBar, "Leave")
      .withArgs(bob.address, expectedBobLeaveLpAmount, expectedBobFreshSushiAmount)
    expect(await vestingToken.balanceOf(bob.address)).to.equal(expectedBobLeaveLpAmount)
  })
})
