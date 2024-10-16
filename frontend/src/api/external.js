import axios from 'axios';

const NEWS_API_KEY = process.env.REACT_APP_NEWS_API_KEY;

const CRYPTO_API_ENDPOINT =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false";

const NEWS_API_ENDPOINT =`https://newsapi.org/v2/everything?q=bitcoin&apiKey=${NEWS_API_KEY}`;
export const getNews = async () => {
    try {
      const response = await axios.get(NEWS_API_ENDPOINT);
      return response.data.articles;
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  
export const getCrypto = async () => {
    let response;
  
    try {
      response = await axios.get(CRYPTO_API_ENDPOINT);
  
      response = response.data;
    } catch (error) {}
  
    return response;
  };