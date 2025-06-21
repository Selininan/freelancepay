import * as StellarSdk from "@stellar/stellar-sdk";

const server = new StellarSdk.Server("https://horizon-testnet.stellar.org");

/* ------------------------------------------
   1) Yeni cüzdan oluştur ve friendbot'tan XLM al
------------------------------------------- */
export async function createWallet() {
  const keypair = StellarSdk.Keypair.random();

  const response = await fetch(
    `https://friendbot.stellar.org?addr=${keypair.publicKey()}`
  );

  if (!response.ok) {
    throw new Error("Friendbot'tan XLM yükleme başarısız oldu");
  }

  return {
    publicKey: keypair.publicKey(),
    secretKey: keypair.secret(),
  };
}

/* ------------------------------------------
   2) Cüzdan bakiyesini getir
------------------------------------------- */
type BalanceLine = {
  balance: string;
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
};

export async function getBalance(publicKey: string): Promise<string> {
  try {
    const account = await server.loadAccount(publicKey);
    const balance = account.balances.find(
      (b: BalanceLine) => b.asset_type === "native"
    );
    return balance ? balance.balance : "0";
  } catch (error) {
    console.error("Bakiye alma hatası:", error);
    return "0";
  }
}

/* ------------------------------------------
   3) Ödeme gönder (XLM)
------------------------------------------- */
export async function sendPayment(
  fromSecret: string,
  toPublic: string,
  amount: string
) {
  try {
    const sourceKeypair = StellarSdk.Keypair.fromSecret(fromSecret);
    const account = await server.loadAccount(sourceKeypair.publicKey());
    const fee = await server.fetchBaseFee();

    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: toPublic,
          asset: StellarSdk.Asset.native(),
          amount,
        })
      )
      .setTimeout(30)
      .build();

    transaction.sign(sourceKeypair);
    const result = await server.submitTransaction(transaction);
    return result;
  } catch (error) {
    console.error("Ödeme gönderme hatası:", error);
    throw error;
  }
}
