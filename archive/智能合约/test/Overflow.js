const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}

const ether = tokens

describe('WETH9', () => {
  let contract
  let deployer, user1, user2, users
  let escrowAmount = ether(0.001)

  beforeEach(async () => {
    [deployer, user1, user2, ...users] = await ethers.getSigners();
    const WETH9 = await ethers.getContractFactory('WETH9')
    contract = await WETH9.deploy()
    // contract.connect(deployer)
  })

  describe('case 1', () => {
    it('case 101', async () => {
      // Increment once
      transaction = await contract.connect(deployer).deposit({value: escrowAmount})
      await transaction.wait()
      //_name = await contract.name()

      const balance = await contract.getBalance()
      expect(balance).to.equal(escrowAmount)

    })
  })

})
