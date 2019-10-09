import Web3Service from '~background/services/NetworkService';
import {
    ACEConfig,
} from '~config/contracts';


export default async function fetchAssets({
    fromBlock = 'earliest',
    toBlock = 'latest',
    assetAddress = null,
    networkId,
} = {}) {
    if (!networkId && networkId !== 0) {
        return {
            error: new Error("'networkId' cannot be empty in fetchAssets"),
            assets: null,
        };
    }

    const eventName = ACEConfig.events.сreateNoteRegistry;

    const options = {
        fromBlock,
        toBlock,
    };

    if (assetAddress) {
        options.filter = {
            registryOwner: assetAddress,
        };
    }

    try {
        const data = await Web3Service()
            .useContract(ACEConfig.name)
            .events(eventName)
            .where(options);

        const assets = data.map(({
            blockNumber,
            returnValues: {
                registryOwner,
                registryAddress,
                scalingFactor,
                linkedTokenAddress,
                canAdjustSupply,
                canConvert,
            },
        }) => ({
            blockNumber,
            registryOwner,
            registryAddress,
            scalingFactor,
            linkedTokenAddress,
            canAdjustSupply,
            canConvert,
        }));

        return {
            error: null,
            assets,
        };
    } catch (error) {
        return {
            error,
            assets: null,
        };
    }
}
