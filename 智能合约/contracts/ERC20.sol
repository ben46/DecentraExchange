pragma solidity ^0.8.6;
import "./IERC20.sol";

contract ERC20 is IERC20{

    mapping(address => uint) public balanceOf;
    mapping(address => mapping(address=>uint)) public allowance;

    uint public totalSupply;
    string public name;
    string public symbol;

    constructor(string memory nm, string memory syb){
        name = nm;
        symbol = syb;
    }

    function _mint(address account, uint value) internal{
        require(account != address(0), "ERC20: invalid mint addr");

        totalSupply += value;
        unchecked { // 如果totoalsupply都没有溢出，那么下面这个更不会溢出，所以不用检查
            balanceOf[account] += value;
        }
        emit Transfer(address(0), account, value);
    }

    function _burn(address account, uint value) internal{
        require(account != address(0), "ERC20: invalid mint addr");
        require(balanceOf[account] >= value, 'ERC20:insufficient balance');
        unchecked {
            balanceOf[account] -= value;
            totalSupply -= value;
        }
        emit Transfer(account, address(0), value);
    }

    function decimals() public view virtual override returns (uint8){
        return 18;
    } 

    // internal function
    function _approve(address spender, address owner, uint amount) internal{
        require(spender != address(0), 'ERC20: invalid spender address');
        require(owner != address(0), 'ERC20: invalid owner address');
        allowance[owner][spender] = amount;
    }

    function approve(address spender, uint amount) public override virtual returns (bool){
        //require(balanceOf[msg.sender] >= amount, "ERC20:insufficient balance");
        _approve(spender, msg.sender, amount);
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    // internal function
    function _spendAllowance(address spender, address owner, uint amount)internal{
        if(allowance[owner][spender] != type(uint).max){
            unchecked {
                _approve(spender, owner, allowance[owner][spender]- amount);
            }
        }
    }

    function _transferFrom(address from, address to, uint amount) private returns(bool){
        if(from != msg.sender) {
            require(allowance[from][msg.sender] >= amount, 'ERC20:insufficient allowance');
            _spendAllowance(msg.sender, from, amount);
        }
        balanceOf[from] -= amount;
        balanceOf[to] +=amount;
        emit Transfer(from, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint amount) public override virtual returns(bool){
        return _transferFrom(from, to, amount);
    }

    function transfer(address to, uint value) public virtual override returns (bool){    
        return _transferFrom(msg.sender, to, value);
    }

}