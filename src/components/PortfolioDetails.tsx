import NumberFormat from "react-number-format";

interface PortfolioDetailsProps {
  name: string;
  cash: number;
  shares: number;
  portfolioValue: number;
  startingBalance: number;
}

const PortfolioDetails = ({
  name,
  cash,
  shares,
  portfolioValue,
  startingBalance,
}: PortfolioDetailsProps): JSX.Element => {
  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          {name} Portfolio
        </h3>
      </div>
      <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
        <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">Cash</dt>
            <dd className="mt-1 text-sm text-gray-900">
              <NumberFormat
                value={cash}
                decimalScale={2}
                fixedDecimalScale
                displayType={"text"}
                thousandSeparator={true}
                prefix={"$"}
              />
            </dd>
          </div>
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">
              Portfolio Value
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              <NumberFormat
                style={{
                  color: portfolioValue >= startingBalance ? "green" : "red",
                }}
                value={portfolioValue}
                decimalScale={2}
                fixedDecimalScale
                displayType={"text"}
                thousandSeparator={true}
                prefix={"$"}
              />
            </dd>
          </div>
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">Shares</dt>
            <dd className="mt-1 text-sm text-gray-900">{shares}</dd>
          </div>
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">
              Rate of Return
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {parseFloat(
                (
                  ((portfolioValue - startingBalance) / startingBalance) *
                  100
                ).toFixed(2)
              )}
              %
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
};
export default PortfolioDetails;
