const autoBind = require("auto-bind");
const { default: axios } = require("axios");
const { logger } = require("../../../common/utils");
const { ExternalAPIError } = require("../error.handling");

class MarketService {
    constructor(){
        autoBind(this)
    }

    async getCoinList(page = 1, per_page = 20){
        const url = 'https://api.coingecko.com/api/v3/coins/list'
        try {
            const response = await axios.get(url, {
                params: {
                    page: page,
                    per_page: per_page
                },
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

    async getCoinMarketData(coinId, vsCurrency = 'usd', page = 1, per_page = 20){
        const url = 'https://api.coingecko.com/api/v3/coins/markets'
        try {
            const response = await axios.get(url, {
                params: {
                    vs_currency: vsCurrency,
                    ids: coinId,
                    page: page,
                    per_page: per_page
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

    async getTrendingCoins(page = 1, per_page = 20){
        const url = `https://api.coingecko.com/api/v3/search/trending`
        try {
            const response = await axios.get(url, {
                params: {
                    page,
                    per_page
                },
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

    async getSupportedCurrencies(){
        const url = 'https://api.coingecko.com/api/v3/simple/supported_vs_currencies';
        try {
            const response = await axios.get(url, {
                headers: {
                    accept: 'application/json',
                    'x-cg-demo-api-key': ' CG-A8496fii4gtpiNk6DEebo3ok '
                }
            })
            return response.data
        } catch (error) {
            console.error('Error fetching supported currencies data:', error)
            throw error
        }
    }

    async getCoinPrice(crypto, currency) {   
        const lowerCaseCurrency = currency.toLowerCase();
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${crypto}&vs_currencies=${lowerCaseCurrency}`;
        try {
            const response = await axios.get(url, {
                headers: {
                    accept: 'application/json',
                    'x-cg-demo-api-key': ' CG-A8496fii4gtpiNk6DEebo3ok '
                }
            });
            const rate = response.data[crypto]?.[lowerCaseCurrency];
            logger.info(`Fetched price for ${crypto} in ${currency}: ${rate}`);

            if (!rate) {
                throw new ExternalAPIError(`Failed to retrieve price for ${crypto} in ${currency}`, 'CoinGecko');
            }

            return rate;
        } catch (error) {
            logger.error(`Error fetching coin price for ${crypto} in ${lowerCaseCurrency}: ${error.message}`);
            throw new Error(`Failed to retrieve price for ${crypto} in ${currency}: ${error.message}`);
        }
    }

    async getExchangeRate(fromCurrency, toCurrency) {
        const cacheKey = `${fromCurrency}_${toCurrency}`;
        if (exchangeRateCache[cacheKey]) {
            logger.info(`Using cached exchange rate for ${fromCurrency} to ${toCurrency}`);
            return exchangeRateCache[cacheKey];
        }

        try {
            const response = await axios.get("https://api.coingecko.com/api/v3/exchange_rates", {
                headers: { accept: 'application/json' }
            });

            const apiRates = response.data.rates;
            const fromRate = apiRates[fromCurrency.toLowerCase()];
            const toRate = apiRates[toCurrency.toLowerCase()];

            if (fromRate && toRate) {
                const rate = toRate.value / fromRate.value;
                exchangeRateCache[cacheKey] = rate;
                setTimeout(() => delete exchangeRateCache[cacheKey], 3600000); // Cache expires in 1 hour
                logger.info(`Using API rate for ${fromCurrency} to ${toCurrency}: ${rate}`);
                return rate;
            }

            throw new Error("Invalid rates returned from API");
        } catch (error) {
            logger.error(`Failed to fetch exchange rate: ${error.message}. Falling back to default rates.`);
        }
    }

}

module.exports = new MarketService()

