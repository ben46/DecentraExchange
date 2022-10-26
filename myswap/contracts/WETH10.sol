pragma solidity ^0.8.6;

contract WETH10{

    //uint public totalSupply;
    mapping(address => uint) balanceOf;
    mapping(address => mapping(address=>uint)) allowance;

    constructor(){
    }

    event WithdrawEvent(address indexed to, uint amount);
    event DepoitEvent(address indexed from, uint amount);
    event ApprovalEvent(address indexed owner, address indexed spender, uint amount);
    event TransferEvent(address indexed from, address indexed to, uint amount);

    receive() external payable {
        deposit();
    }

    function deposit() public payable{
        balanceOf[msg.sender] += msg.value;
        emit DepoitEvent(msg.sender, msg.value);
    }

    function withdraw(uint _amount) public{
        require(_amount <= balanceOf[msg.sender], 'not enough money');
        balanceOf[msg.sender] -= _amount;
        payable(msg.sender).transfer(_amount);
        emit WithdrawEvent(msg.sender, _amount);
    }

    function getBalance(address _addr) public view returns (uint){
        return balanceOf[_addr];
    }

    // internal function
    function _approve(address spender, address owner, uint amount) internal{
        require(spender != address(0), 'ERC20: invalid spender address');
        require(owner != address(0), 'ERC20: invalid owner address');
        allowance[owner][spender] = amount;
    }

    function approve(address spender, uint amount) public {
        require(balanceOf[msg.sender] >= amount, "ERC20:insufficient balance");
        _approve(spender, msg.sender, amount);
        emit ApprovalEvent(msg.sender, spender, amount);
    }

    function getAllowance(address _owner)view public returns(uint){
        return allowance[_owner][msg.sender];
    }

    // internal function
    function _spendAllowance(address spender, address owner, uint amount)internal{
        if(allowance[owner][spender] != type(uint).max){
            unchecked {
                _approve(spender, owner, allowance[owner][spender]- amount);
            }
        }
    }

    function transferFrom(address from, address to, uint amount) public returns(bool){
        if(from != msg.sender) {
            require(allowance[from][msg.sender] >= amount, 'ERC20:insufficient allowance');
            _spendAllowance(msg.sender, from, amount);
        }
        balanceOf[from] -= amount;
        balanceOf[to] +=amount;
        emit TransferEvent(from, to, amount);
        return true;
    }

}