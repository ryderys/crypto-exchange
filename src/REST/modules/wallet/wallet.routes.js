const authenticate = require("../../../common/auth.guard")
const walletController = require("./wallet.controller")

const router = require("express").Router()

router.post('/create', authenticate, walletController.createWallet)

router.get('/myWallet', authenticate, walletController.getWalletByUserId)

router.post('/deposit', authenticate, walletController.depositByCurrency)

router.post('/withdraw', authenticate, walletController.withdrawFunds)

router.post('/transfer', authenticate, walletController.transferFunds)
router.get('/lock', authenticate, walletController.lockWallet)
router.get('/unlock', authenticate, walletController.unlockWallet)

router.get('/:walletId/transactions', authenticate, walletController.getTransactionHistory)

router.get('/:walletId/balance', authenticate, walletController.checkBalance)


module.exports = {
    walletRouter: router
}