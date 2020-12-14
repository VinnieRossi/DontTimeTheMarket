import React from "react";
import NumberFormat from "react-number-format";

interface TransactionHistoryProps {
  startingBalance: number;
  transactions: any[];
}

const TransactionHistory = ({
  startingBalance,
  transactions,
}: TransactionHistoryProps) => {
  const generateTransactionLineItem = (
    transaction: any,
    index: number
  ): any => {
    const dateString = transaction.date
      .toLocaleDateString()
      .split("/")
      .splice(0, 2)
      .join("/");

    return (
      <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {dateString}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
          {transaction.transactionType}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {transaction.shareQuantity}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          <NumberFormat
            value={transaction.pricePerShare}
            style={{
              color: transaction.net >= 0 ? "green" : "red",
            }}
            decimalScale={2}
            fixedDecimalScale
            displayType={"text"}
            thousandSeparator={true}
            prefix={"$"}
          />
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
          {transaction.net === 0 ? (
            <span>--</span>
          ) : (
            <NumberFormat
              value={transaction.net}
              style={{
                color: transaction.net >= 0 ? "green" : "red",
              }}
              decimalScale={2}
              fixedDecimalScale
              displayType={"text"}
              thousandSeparator={true}
              prefix={"$"}
            />
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <NumberFormat
            value={transaction.currentPortfolioBalance}
            style={{
              color:
                transaction.currentPortfolioBalance >= startingBalance
                  ? "green"
                  : "red",
            }}
            decimalScale={2}
            fixedDecimalScale
            displayType={"text"}
            thousandSeparator={true}
            prefix={"$"}
          />
        </td>
      </tr>
    );
  };

  return (
    <div>
      <div className="bg-white px-4 py-5 border-b border-gray-200 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Transaction History
        </h3>
      </div>
      <div className="bg-white shadow overflow-x-hidden max-h-80 sm:rounded-lg">
        <div className="flex flex-col">
          <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
              <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Date
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Action
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Shares
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Share Price
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Net Gain/Loss
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction, index) =>
                      generateTransactionLineItem(transaction, index)
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionHistory;
