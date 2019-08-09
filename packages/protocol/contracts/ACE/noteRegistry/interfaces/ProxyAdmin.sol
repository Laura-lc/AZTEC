pragma solidity ^0.5.0;

/**
 * @title ProxyAdmin
 * @dev Minimal interface for the proxy contract to be used by the Factory contract.
 */
contract ProxyAdmin {
    function admin() external returns (address);

    function upgradeTo(address newImplementation) external;
}