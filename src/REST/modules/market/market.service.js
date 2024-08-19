const autoBind = require("auto-bind");
const { default: axios } = require("axios");

class MarketService {
    constructor(){
        autoBind(this)
    }

    async getCoinList(){
        const url = 'https://api.coingecko.com/api/v3/coins/list'
        try {
            const response = await axios.get(url, {
                headers: {
                    accept: 'application/json',
                    'x-cg-demo-api-key': ' CG-A8496fii4gtpiNk6DEebo3ok '
                }
            })
            return response.data
            
        } catch (error) {
            console.error('Error fetching coinGecko data', error)
            throw error
        }
    }

    async getCoinMarketData(coinId, vsCurrency = 'usd'){
        const url = 'https://api.coingecko.com/api/v3/coins/markets'
        try {
            const response = await axios.get(url, {
                params: {
                    vs_currency: vsCurrency,
                    ids: coinId
                },
                headers: {
                    accept: 'application/json',
                    'x-cg-demo-api-key': ' CG-A8496fii4gtpiNk6DEebo3ok '
                }
            })
            return response.data
        } catch (error) {
            console.error('Error fetching coin market data:', error)
            throw error
        }
    }
    async getCoinHistoricalData(coinId, date){
        const url = `https://api.coingecko.com/api/v3/coins/${coinId}/history`
        try {
            const response = await axios.get(url, {
                params: {
                    date: date
                },
                headers: {
                    accept: 'application/json',
                    'x-cg-demo-api-key': ' CG-A8496fii4gtpiNk6DEebo3ok '
                }
            })
            return response.data
        } catch (error) {
            console.error('Error fetching coin historical data:', error)
            throw error
        }
    }

    async getCoinDataById(coinId){
        const url = `https://api.coingecko.com/api/v3/coins/${coinId}`
        try {
            const response = await axios.get(url, {
                headers: {
                    accept: 'application/json',
                    'x-cg-demo-api-key': ' CG-A8496fii4gtpiNk6DEebo3ok '
                }
            })
            return response.data
        } catch (error) {
            console.error('Error fetching coin data by ID:', error)
            throw error
        }
    }

    async getTrendingCoins(){
        const url = `https://api.coingecko.com/api/v3/search/trending`
        try {
            const response = await axios.get(url, {
                headers: {
                    accept: 'application/json',
                    'x-cg-demo-api-key': ' CG-A8496fii4gtpiNk6DEebo3ok '
                }
            })
            return response.data.coins
        } catch (error) {
            console.error('Error fetching trending coins:', error)
            throw error
        }
    }

    async getGlobalMarketData(){
        const url = `https://api.coingecko.com/api/v3/global`
        try {
            const response = await axios.get(url, {
                headers: {
                    accept: 'application/json',
                    'x-cg-demo-api-key': ' CG-A8496fii4gtpiNk6DEebo3ok '
                }
            })
            return response.data.data
        } catch (error) {
            console.error('Error fetching global market data:', error)
            throw error
        }
    }



}

module.exports = new MarketService()

