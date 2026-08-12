type DetailTrustCard = {
  title: string;
  description: string;
};

type PaymentSecurityContent = {
  methods: string[];
  description: string;
};

type DetailTrustCardsProps = {
  paymentSecurity?: PaymentSecurityContent;
  cards?: DetailTrustCard[];
};

export default function DetailTrustCards({
  paymentSecurity,
  cards = [],
}: DetailTrustCardsProps) {
  if (!paymentSecurity && cards.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 space-y-3">
      {paymentSecurity ? (
        <div className="rounded-[18px] bg-[#f0f2ff] px-6 py-5">
          <h3 className="font-heading text-lg text-[#111111]">
            PAYMENT &amp; SECURITY
          </h3>

          <div className="mt-4 flex flex-wrap gap-2">
            {paymentSecurity.methods.map((method) => (
              <span
                key={method}
                className="rounded bg-white px-2 py-1 text-[10px] font-bold text-[#3057a6] shadow-sm"
              >
                {method}
              </span>
            ))}
          </div>

          <p className="mt-4 text-sm leading-6 text-[#666666]">
            {paymentSecurity.description}
          </p>
        </div>
      ) : null}

      {cards.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 text-sm text-gray-600 sm:grid-cols-2">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-gray-200 p-4"
            >
              <p className="font-semibold text-gray-900">{card.title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}