const { GraphQLList, GraphQLID } = require("graphql");
const { VerifyAccessTokenInGraphQL } = require("../../common/utils");
const WalletSchema = require("../../REST/modules/wallet/wallet.model");
const { WalletType, WalletTransactionsType } = require("../typeDefs/wallet.types");
const TransactionSchema = require("../../REST/modules/transactions/transactions.model");

const getWallets = {
    type: new GraphQLList(WalletType),
    resolve: async (parent, args , {req}) => {
        try {
            const {id} = await VerifyAccessTokenInGraphQL(req)
            
            const wallets = await WalletSchema.findAll({
                where: {userId : id},
                attributes: ['id', 'walletName', 'balances', 'createdAt', 'updatedAt']
            })
            
            if (!wallets.length) throw new WalletError('No wallets found for this user', 404);
            const formattedWallets = wallets.map(wallet => {
                const balances = Object.entries(wallet.balances).map(([currency, amount]) => ({
                    currency,
                    amount
                }))
                return {
                    id: wallet.id,
                    walletName: wallet.walletName,
                    balances,
                    createdAt: wallet.createdAt,
                    updatedAt: wallet.updatedAt
                }
            })
            return formattedWallets
        } catch (error) {
            throw new Error(`error fetching user wallets ${error.message}`)
        }
    }
}

const getWalletTransactions = {
    type: new GraphQLList(WalletTransactionsType),
    args: {walletId: {type: GraphQLID}},
    resolve: async (parent, {walletId}, {req}) => {
        const {id} = await VerifyAccessTokenInGraphQL(req)
        const transaction = await TransactionSchema.findAll({
            where: {walletId, userId: id},
            order: [['createdAt', 'DESC']]
        })
        return transaction
    }
}

module.exports = {
    getWallets,
    getWalletTransactions
}