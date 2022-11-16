pragma solidity ^0.8.6;

contract WETH10{

    event Approval(address indexed owner, address indexed spender, uint value);
    event Transfer(address indexed from, address indexed to, uint value);
    event Withdraw(address indexed to, uint amount);
    event Depoit(address indexed from, uint value);

    uint8 internal _decimals;
    uint internal _totalSupply;

    mapping(address => uint) private _balanceOf;
    mapping(address => mapping(address=>uint)) private _allowance;

    string private _name;
    string private _symbol;

    function name() external view returns (string memory){
        return _name;
    }

    function symbol() external view returns (string memory){
        return _symbol;
    }

    function balanceOf(address owner) external view returns (uint){
        return _balanceOf[owner];
    }

    function getBalance(address _addr) public view returns (uint){
        return _balanceOf[_addr];
    }

    function decimals() external view returns (uint8){
        return _decimals;
    }

    function totalSupply() external view returns (uint){
        return _totalSupply;
    }

    // internal function
    function _approve(address spender, address owner, uint amount) internal{
        require(spender != address(0), 'ERC20: invalid spender address');
        require(owner != address(0), 'ERC20: invalid owner address');
        _allowance[owner][spender] = amount;
    }

    function allowance(address owner, address spender) external view returns (uint){
        return _allowance[owner][spender];
    }

    function approve(address spender, uint amount) external returns (bool){
        // require(_balanceOf[msg.sender] >= amount, "ERC20:insufficient balance");
        _approve(spender, msg.sender, amount);
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function getAllowance(address _owner)view external returns(uint){
        return _allowance[_owner][msg.sender];
    }

    // internal function
    function _spendAllowance(address spender, address owner, uint amount)internal{
        if(_allowance[owner][spender] != type(uint).max){
            unchecked {
                _approve(spender, owner, _allowance[owner][spender]- amount);
            }
        }
    }

    function _transferFrom(address from, address to, uint amount) private returns(bool){
        if(from != msg.sender) {
            require(_allowance[from][msg.sender] >= amount, 'ERC20:insufficient allowance');
            _spendAllowance(msg.sender, from, amount);
        }
        _balanceOf[from] -= amount;
        _balanceOf[to] +=amount;
        emit Transfer(from, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint amount) external  returns(bool){
        return _transferFrom(from, to, amount);
    }

    function transfer(address to, uint value) external  returns (bool){    
        return _transferFrom(msg.sender, to, value);
    }

    receive() external payable {
        _deposit();
    }

    constructor(){
        _decimals = 8;
        _totalSupply = type(uint).max;
    }

    function _deposit() private{
        _balanceOf[msg.sender] += msg.value;
        emit Depoit(msg.sender, msg.value);
    }


    function deposit() external payable{
        _deposit();
    }

    function withdraw(uint _amount) external{
        require(_amount <= _balanceOf[msg.sender], 'not enough money');
        _balanceOf[msg.sender] -= _amount;
        payable(msg.sender).transfer(_amount);
        emit Withdraw(msg.sender, _amount);
    }

}