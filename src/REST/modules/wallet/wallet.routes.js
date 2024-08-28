const authenticate = require("../../../common/auth.guard")
const walletController = require("./wallet.controller")

const router = require("express").Router()

router.post('/create', authenticate, walletController.createWallet)

router.get('/myWallet', authenticate, walletController.getWalletByUserId)

router.post('/deposit', authenticate, walletController.depositFunds)

router.post('/withdraw', authenticate, walletController.withdrawFunds)

router.post('/transfer', authenticate, walletController.transferFunds)
router.post('/convert', authenticate, walletController.convertFunds)
router.get('/supportedCurrencies', walletController.getSupportedCurrencies)

router.post('/lock', authenticate, walletController.lockWallet)
router.post('/unlock', authenticate, walletController.unlockWallet)

router.post('/convert', walletController.convertFunds)

router.get('/transactions:walletId/', authenticate, walletController.getTransactionHistory)

router.get('/balance/:walletId', authenticate, walletController.checkBalance)

router.delete('/remove/:walletId', authenticate, walletController.deleteWallet)

module.exports = {
    walletRouter: router
}