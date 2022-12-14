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
const bigNumberify = wei
const overrides = {
  gasLimit: 9999999
}
let c_WETH10, c_Token01, c_Token02, c_UniswapV2Router02, c_UniswapPair, c_UniswapFactory, c_route02
let owner, dev, treasury, alice, bob, carol
let l_UniswapV2Library, l_TransferHelper, c_SushiToken
const treasuryPercentage = 128
const lpPercentage = 872
//MasterChef
async function myPrepare(){
    const SushiToken = await ethers.getContractFactory("SushiToken");
    c_SushiToken = await SushiToken.deploy();
}

 async function advanceBlock() {
    return ethers.provider.send("evm_mine", [])
}
  
 async function advanceBlockTo(blockNumber) {
    for (let i = await ethers.provider.getBlockNumber(); i < blockNumber; i++) {
      await advanceBlock()
    }
}
  
async function deployChef(c_SushiToken, treasuryAddress, beetsPerBlock, startBlock){
    const MasterChef = await ethers.getContractFactory("MasterChefV2");
    const c_masterChef = await MasterChef.deploy(c_SushiToken, 
                                                treasuryAddress, 
                                                beetsPerBlock, 
                                                startBlock);
    await c_masterChef.deployed()
    return c_masterChef
}

async function deployERC20Token(name,symbol, ownerBalance){
    const ERC20Token = await ethers.getContractFactory('ERC20Token')
    const c_ERC20Token = await ERC20Token.deploy(name, symbol, ownerBalance)
    await c_ERC20Token.deployed()
    return c_ERC20Token
}

async function deployRewarder(_rewardMultiplier, _rewardTokenContract, _masterChefAddress){
    const RewarderMock = await ethers.getContractFactory('RewarderMock')
    const c_RewarderMock = await RewarderMock.deploy(_rewardMultiplier, _rewardTokenContract, _masterChefAddress)
    await c_RewarderMock.deployed()
    return c_RewarderMock
}


describe('??????????????????', () => {

    before(async () => {
        [owner, dev, treasury,alice,bob,carol, ...users] = await ethers.getSigners();
    })

    beforeEach(async () => {
        await myPrepare();
    })

    it('???????????????', async () => {
        const startBlock = 521
        const sushiPerBlock = ether(6)
        const chef = await deployChef(c_SushiToken.address, treasury.address, sushiPerBlock, startBlock)
        await c_SushiToken.transferOwnership(chef.address)
    
        const actualBeetsAddress = await chef.SUSHI()
        const actualTreasuryAddress = await chef.treasuryAddress()
        const actualBeetsOwnerAddress = await c_SushiToken.owner()
    
        const actualTreasuryPercentage = await chef.TREASURY_PERCENTAGE()
        const actualSushisPerBlock = await chef.sushiPerBlock()
    
        expect(actualBeetsAddress).to.equal(c_SushiToken.address)
        expect(actualTreasuryAddress).to.equal(treasury.address)
        expect(actualBeetsOwnerAddress).to.equal(chef.address)
    
        expect(actualTreasuryPercentage).to.equal(treasuryPercentage)
        expect(actualSushisPerBlock).to.equal(sushiPerBlock)
        
    }) 

    it("?????????????????????", async function () {
        const chef = await deployChef(c_SushiToken.address, treasury.address, ether(6), 0)
        await c_SushiToken.transferOwnership(chef.address)
    
        const lp1Token = await deployERC20Token("LP Token 1", "LPT1", 10)
        const lp2Token = await deployERC20Token("LP Token 2", "LPT2", 10)
    
        await chef.add(10, lp1Token.address, ethers.constants.AddressZero)
        await chef.add(10, lp2Token.address, ethers.constants.AddressZero)
        expect(await chef.poolLength()).to.be.equal(2)
    })

    it("???????????????????????????????????????", async function () {
        const chef = await deployChef(c_SushiToken.address, treasury.address, ether(6), 0)
        await c_SushiToken.transferOwnership(chef.address)

        const rewarderToken = await deployERC20Token("RewarderToken", "RT1", 10)
        // ???????????????rewarder??????
        const rewarder = await deployRewarder(1, rewarderToken.address, chef.address)
        const rewarder2 = await deployRewarder(1, rewarderToken.address, chef.address)

        const lp1Token = await deployERC20Token("LP Token 1", "LPT1", 10)
        const lp2Token = await deployERC20Token("LP Token 2", "LPT2", 10)

        await chef.add(10, lp1Token.address, rewarder.address)
        await chef.add(10, lp2Token.address, rewarder.address)
        await expect(chef.set(0, 15, ethers.constants.AddressZero, false)).to.emit(chef, "LogSetPool").withArgs(0, 15, rewarder.address, false)

        expect((await chef.poolInfo(0)).allocPoint).to.equal(15)
        expect(await chef.rewarder(0)).to.equal(rewarder.address)

        await expect(chef.set(0, 18, rewarder2.address, true)).to.emit(chef, "LogSetPool").withArgs(0, 18, rewarder2.address, true)
        expect((await chef.poolInfo(0)).allocPoint).to.equal(18)
        expect(await chef.rewarder(0)).to.equal(rewarder2.address)
    })

    it("????????????????????????", async function () {
        const sushiPerBlock = ether(6)
        const chef = await deployChef(c_SushiToken.address, treasury.address, sushiPerBlock, 0)
        await c_SushiToken.transferOwnership(chef.address)

        const lp1Token = await deployERC20Token("LP Token 1", "LPT1", 10)
        await lp1Token.transfer(alice.address, 10)

        await chef.add(10, lp1Token.address, ethers.constants.AddressZero)

        await lp1Token.connect(alice).approve(chef.address, 10)

        const depositionPoint = await chef.connect(alice).deposit(0, 1, alice.address)
        expect(depositionPoint.blockNumber).to.greaterThan(0)
        await advanceBlockTo(depositionPoint.blockNumber + 9)
        await chef.updatePool(0)
        expect(await chef.pendingSushi(0, alice.address)).to.equal(percentageOf(sushiPerBlock.mul(10), lpPercentage))
    })


    it("????????????", async function () {
        const chef = await deployChef(c_SushiToken.address, treasury.address, 1000, 0)
        await c_SushiToken.transferOwnership(chef.address)

        const rewarderToken = await deployERC20Token("Rewarder token", "RW", 10_000)
        const rewarder = await deployRewarder(1, rewarderToken.address, chef.address)

        const lp = await deployERC20Token("Lp 1", "lp1", 10_000)

        await lp.transfer(bob.address, "1000")
        await lp.connect(bob).approve(chef.address, "1000")

        await chef.add("100", lp.address, rewarder.address)
        await chef.connect(bob).deposit(0, "100", bob.address)

        expect(await lp.balanceOf(bob.address)).to.equal("900")

        await advanceBlock()
        await chef.updatePool(0)

        await expect(chef.connect(bob).emergencyWithdraw(0, bob.address))
            .to.emit(chef, "EmergencyWithdraw")
            .withArgs(bob.address, 0, 100, bob.address)
        expect(await lp.balanceOf(bob.address)).to.equal("1000")
    })

    it("????????????????????????????????????????????????", async function () {
        const beetsPerBlock = ether(6)
        const beets = c_SushiToken
        const startBlock = 150
        const chef = await deployChef(c_SushiToken.address, treasury.address, beetsPerBlock, startBlock)
        await c_SushiToken.transferOwnership(chef.address)

        const lp = await deployERC20Token("Lp 1", "lp1", 10_000)

        await lp.transfer(bob.address, "1000")
        await lp.connect(bob).approve(chef.address, "1000")

        await chef.add("100", lp.address, ethers.constants.AddressZero)
        let blkPt = await chef.connect(bob).deposit(0, "100", bob.address) // 92

        await chef.connect(bob).deposit(0, 100, bob.address)
        await advanceBlockTo(110)
    
        await chef.updatePool(0)
        expect(await beets.balanceOf(bob.address)).to.equal(0)
        await advanceBlockTo(120)
    
        await chef.updatePool(0)
        expect(await beets.balanceOf(bob.address)).to.equal(0)
        await advanceBlockTo(130)
    
        await chef.updatePool(0) // block 100
        expect(await beets.balanceOf(bob.address)).to.equal(0)
        await advanceBlockTo(150)
    
        await chef.connect(bob).harvest(0, bob.address)
        expect(await beets.balanceOf(bob.address)).to.equal(percentageOf(beetsPerBlock, lpPercentage))
        expect(await beets.balanceOf(treasury.address)).to.equal(percentageOf(beetsPerBlock, treasuryPercentage))
        expect(await beets.totalSupply()).to.equal(beetsPerBlock)
    
        await advanceBlockTo(154)
    
        blkPt = await chef.connect(bob).harvest(0, bob.address) // block 155
        expect(await beets.balanceOf(bob.address)).to.equal(percentageOf(beetsPerBlock.mul(blkPt.blockNumber - startBlock), lpPercentage))
        expect(await beets.balanceOf(treasury.address)).to.equal(percentageOf(beetsPerBlock.mul(blkPt.blockNumber - startBlock), treasuryPercentage))
        expect(await beets.totalSupply()).to.equal(beetsPerBlock.mul(5))
                
    })

    it("??????????????????????????????sushi", async function () {
        /*
        ???????????????: FractionOfTotalLps * ???????????? * ?????????????????? * ??????????????????????????????
        where RewardsPerBlock = 1000 & FractionOfRewardsForPool = 60%

        ??????????????????:
        block 310 - alice ????????? 10 LP
        block 314 - bob ????????? 20 LP
         => alice????????? : 1 * 4 * 1000 * 0.6
        block 318 - carol????????? 20 LPs
         => alice????????? = ??????????????? + 1/3 * 4 * 1000 * 0.6
            bob????????? = 2/3 * 4 * 1000 * 0.6
         ....
        */ 
        const beetsPerBlock = wei(6)
        const beets = c_SushiToken
        const startBlock = 300
        const chef = await deployChef(c_SushiToken.address, treasury.address, beetsPerBlock, startBlock)
        await c_SushiToken.transferOwnership(chef.address)

        const lp = await deployERC20Token("Lp 1", "lp1", 10_000)

        await lp.transfer(bob.address, "1000")
        await lp.connect(bob).approve(chef.address, "1000")

        await lp.transfer(alice.address, "1000")
        await lp.connect(alice).approve(chef.address, "1000")

        await lp.transfer(carol.address, "1000")
        await lp.connect(carol).approve(chef.address, "1000")

        await chef.add("100", lp.address, ethers.constants.AddressZero)

        const lpRewards = rewardsCalculator(beetsPerBlock, lpPercentage) // ?????????????????????
        const treasuryRewards = rewardsCalculator(beetsPerBlock, treasuryPercentage)

        await advanceBlockTo(309)
        await chef.connect(alice).deposit(0, "10", alice.address)//310

        await advanceBlockTo(312)
        await chef.connect(alice).harvest(0, alice.address) // block 313
        expect(await beets.balanceOf(alice.address)).to.equal(lpRewards(3)) // ??????????????????3?????????

        await chef.connect(bob).deposit(0, "20", bob.address) //314
        await advanceBlockTo(315)

        await setAutomineBlocks(false)

        await chef.connect(alice).harvest(0, alice.address) // block 316
        await chef.connect(bob).harvest(0, bob.address) // block 316
        
        await advanceBlockTo(316)
        await setAutomineBlocks(true)
        const aliceBalance316 = lpRewards(4).add(lpRewards(2).div(3))// ????????????4????????????????????????2???????????????bob??????????????????1/3
        expect(await beets.balanceOf(alice.address)).to.equal(aliceBalance316)

        const bobBalance316 = lpRewards(2).mul(2).div(3)
        expect(await beets.balanceOf(bob.address)).to.equal(bobBalance316)
    
        // Carol ?????? 30 LPs at block 318
        await chef.connect(carol).deposit(0, "30", carol.address) // block 317
        await advanceBlockTo(319)
        await chef.connect(alice).harvest(0, alice.address) // block 320
        //carol??????????????????block+1????????????block??????bob?????? ???????????????????????????bob???carol?????????
        const aliceBalance320 = aliceBalance316.add(lpRewards(1).div(3)).add(lpRewards(3).div(6))
        expect(await beets.balanceOf(alice.address)).to.equal(aliceBalance320)

        expect(await beets.totalSupply()).to.equal(beetsPerBlock.mul(10))

        expect(await beets.balanceOf(bob.address)).to.equal(bobBalance316)//?????????????????????????????????????????????
        expect(await chef.pendingSushi(0, bob.address)).to.equal(lpRewards(1).mul(2).div(3).add(lpRewards(3).mul(2).div(6)))//bob???????????????????????????

        expect(await beets.balanceOf(carol.address)).to.equal(0)//carol????????????????????????
        const carolPending320 = lpRewards(3).div(2)
        expect(await chef.pendingSushi(0, carol.address)).to.equal(carolPending320)//carol?????????????????????????????????

        const treasuryBalance = treasuryRewards(10)
        //???????????????????????????=???????????????-alice???????????????-bob???????????????-?????????????????????
        expect(await beets.balanceOf(chef.address)).to.equal(beetsPerBlock.mul(10).sub(aliceBalance320).sub(bobBalance316).sub(treasuryBalance))
        //???????????????????????????????????????
        expect(await beets.balanceOf(treasury.address)).to.equal(treasuryBalance)

        await chef.connect(alice).deposit(0, "10", alice.address) // block 321
        await advanceBlockTo(329)
        await chef.connect(bob).withdrawAndHarvest(0, "5", bob.address) // block 330
        //bob??????????????????????????????????????????????????????20???block
        expect(await beets.totalSupply()).to.equal(beetsPerBlock.mul(20))
        //alice????????????????????????
        expect(await beets.balanceOf(alice.address)).to.equal(aliceBalance320)

        const bobBalance330 = bobBalance316
        .add(lpRewards(1).mul(2).div(3))
        .add(lpRewards(3).mul(2).div(6))
        .add(lpRewards(1).mul(2).div(6))
        .add(lpRewards(9).mul(2).div(7))
        //bob????????????????????????
        expect(await beets.balanceOf(bob.address)).to.equal(bobBalance330)
        //carol??????????????????0
        expect(await beets.balanceOf(carol.address)).to.equal(0)
        const carolPending330 = carolPending320.add(lpRewards(1).div(2)).add(lpRewards(9).mul(3).div(7))
        //carol?????????????????????????????????
        expect(await chef.pendingSushi(0, carol.address)).to.equal(carolPending330)

        const treasuryBalance330 = percentageOf(beetsPerBlock.mul(20), treasuryPercentage)
        expect(await beets.balanceOf(chef.address)).to.equal(beetsPerBlock.mul(20).sub(aliceBalance320).sub(bobBalance330).sub(treasuryBalance330))
        expect(await beets.balanceOf(treasury.address)).to.equal(treasuryBalance330)

        await advanceBlockTo(339)
        // ???????????????????????????
        await chef.connect(alice).withdrawAndHarvest(0, 20, alice.address) // block 340
        const aliceBalance340 = aliceBalance320.add(lpRewards(1).div(6)).add(lpRewards(9).mul(2).div(7)).add(lpRewards(10).mul(4).div(13))
        expect(await beets.balanceOf(alice.address)).to.equal(aliceBalance340)

        await advanceBlockTo(349)
        await chef.connect(bob).withdrawAndHarvest(0, 15, bob.address) // block 350
        
        // ????????????????????????????????????1??????????????????
        expect(await beets.balanceOf(bob.address)).to.equal(bobBalance330.add(lpRewards(10).mul(3).div(13)).add(lpRewards(10).div(3)).sub(1))

        await advanceBlockTo(359)
    
        // carol????????????sushi???+?????????LP???
        await chef.connect(carol).withdrawAndHarvest(0, 30, carol.address) // block 360
        expect(await beets.balanceOf(carol.address)).to.equal(
          carolPending330.add(lpRewards(10).mul(6).div(13)).add(lpRewards(10).mul(2).div(3)).add(lpRewards(10))
        )
        
        // ???????????????50???block??????
        expect(await beets.totalSupply()).to.equal(beetsPerBlock.mul(50))
        expect(await beets.balanceOf(treasury.address)).to.equal(treasuryRewards(50))
        // ?????????????????????1000???lp
        expect(await lp.balanceOf(alice.address)).to.equal(1000)
        expect(await lp.balanceOf(bob.address)).to.equal(1000)
        expect(await lp.balanceOf(carol.address)).to.equal(1000)

    })

    it("????????????????????????????????????????????????", async function () {
        const beetsPerBlock = wei(6)
        const beets = c_SushiToken

        const chef = await deployChef(c_SushiToken.address, treasury.address, beetsPerBlock, 100)
        await c_SushiToken.transferOwnership(chef.address)
        const lpRewards = rewardsCalculator(beetsPerBlock, lpPercentage) // ???????????????????????????

        const lp = await deployERC20Token("Lp 1", "lp1", 10_000)
        await lp.transfer(alice.address, "1000")
        await lp.connect(alice).approve(chef.address, "1000")

        const lp2 = await deployERC20Token("Lp 2", "lp2", 10_000)
        await lp2.transfer(bob.address, "1000")
        await lp2.connect(bob).approve(chef.address, "1000")

        await chef.add("10", lp.address, ethers.constants.AddressZero) // lp1????????????10

        await advanceBlockTo(409)
        // alice???lp1??????????????????10???
        await chef.connect(alice).deposit(0, "10", alice.address) // 410
        await advanceBlockTo(419)
        await setAutomineBlocks(false)
        await chef.massUpdatePools([0]) // ????????????
        await chef.add("30", lp2.address, ethers.constants.AddressZero)  // ???????????????
        await setAutomineBlocks(true)
        await advanceBlock()
        expect(await getBlockNumber()).to.eq(420)
        const alicePending420 = lpRewards(10) // 420 - 410
        expect(await chef.pendingSushi(0, alice.address)).to.equal(alicePending420) // 420 - 410

        // Bob ?????? 10 LP2s at block 425
        expect(await getBlockNumber()).to.eq(420)

        await advanceBlockTo(424)
        // bob???lp2??????????????????10???
        await chef.connect(bob).deposit(1, "10", bob.address) //425
        expect(await getBlockNumber()).to.eq(425)

        const alicependingSushi425 = alicePending420.add(lpRewards(5).div(4)) // 420????????? + 5?????????????????? / 4 (??????lp????????????25%)
        expect(await chef.pendingSushi(0, alice.address)).to.equal(alicependingSushi425)

        await advanceBlockTo(430)
        // ????????? 430???Bob ???????????? 5*3/4 ?????????
        expect(await chef.pendingBeets(0, alice.address)).to.equal(alicePendingBeets425.add(lpRewards(5).div(4)))
        expect(await chef.pendingBeets(1, bob.address)).to.equal(lpRewards(5).mul(3).div(4))
        
    })

})

async function getBlockNumber(){
    return await ethers.provider.getBlockNumber()
}

function rewardsCalculator(beetsPerBlock, percentage) {
    return (blocks) => {
      return percentageOf(beetsPerBlock.mul(blocks), percentage)
    }
}

function percentageOf(value, percentage) {
    return value.mul(percentage).div(1000)
}

async function setAutomineBlocks(enabled) {
    return network.provider.send("evm_setAutomine", [enabled])
}