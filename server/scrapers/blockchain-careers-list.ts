/**
 * Top 20 blockchains by market cap with their career page URLs
 * Updated: January 2026
 */

export interface BlockchainCareerSite {
  name: string;
  symbol: string;
  careerUrl: string;
  fallbackUrls?: string[]; // Alternative career page URLs to try
}

export const TOP_BLOCKCHAINS: BlockchainCareerSite[] = [
  {
    name: "Bitcoin",
    symbol: "BTC",
    careerUrl: "https://bitcoin.org/en/jobs",
    fallbackUrls: ["https://bitcoindevlist.com/"]
  },
  {
    name: "Ethereum",
    symbol: "ETH",
    careerUrl: "https://ethereum.org/en/community/get-involved/#ethereum-jobs",
    fallbackUrls: ["https://jobs.ethereum.org/"]
  },
  {
    name: "Binance",
    symbol: "BNB",
    careerUrl: "https://www.binance.com/en/careers",
  },
  {
    name: "Ripple",
    symbol: "XRP",
    careerUrl: "https://ripple.com/company/careers/all-jobs/",
  },
  {
    name: "Solana",
    symbol: "SOL",
    careerUrl: "https://jobs.solana.com/jobs",
  },
  {
    name: "Cardano",
    symbol: "ADA",
    careerUrl: "https://iohk.io/en/careers/",
    fallbackUrls: ["https://cardano.org/careers"]
  },
  {
    name: "Avalanche",
    symbol: "AVAX",
    careerUrl: "https://www.avalabs.org/careers",
  },
  {
    name: "Polkadot",
    symbol: "DOT",
    careerUrl: "https://polkadot.network/jobs/",
    fallbackUrls: ["https://www.parity.io/jobs"]
  },
  {
    name: "Polygon",
    symbol: "POL",
    careerUrl: "https://polygon.technology/careers",
  },
  {
    name: "Chainlink",
    symbol: "LINK",
    careerUrl: "https://chainlinklabs.com/careers",
  },
  {
    name: "Tron",
    symbol: "TRX",
    careerUrl: "https://tron.network/careers",
  },
  {
    name: "Cosmos",
    symbol: "ATOM",
    careerUrl: "https://cosmos.network/careers",
    fallbackUrls: ["https://jobs.interchain.io/"]
  },
  {
    name: "Near Protocol",
    symbol: "NEAR",
    careerUrl: "https://near.org/careers",
    fallbackUrls: ["https://careers.near.org/"]
  },
  {
    name: "Algorand",
    symbol: "ALGO",
    careerUrl: "https://www.algorand.com/about/careers",
  },
  {
    name: "Fantom",
    symbol: "FTM",
    careerUrl: "https://fantom.foundation/careers/",
  },
  {
    name: "Optimism",
    symbol: "OP",
    careerUrl: "https://www.optimism.io/careers",
  },
  {
    name: "Arbitrum",
    symbol: "ARB",
    careerUrl: "https://offchainlabs.com/careers",
  },
  {
    name: "Sui",
    symbol: "SUI",
    careerUrl: "https://mystenlabs.com/careers",
  },
  {
    name: "Aptos",
    symbol: "APT",
    careerUrl: "https://aptoslabs.com/careers",
  },
  {
    name: "Starknet",
    symbol: "STRK",
    careerUrl: "https://starkware.co/careers/",
  },
];
