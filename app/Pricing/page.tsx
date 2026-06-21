export default function Pricing() {
  return (
    <div className="p-10 text-center">
      <h1 className="text-3xl font-bold">Upgrade to TripMuse Pro</h1>

      <div className="mt-10">
        <div className="border p-6 rounded-xl">
          <h2>Free</h2>
          <p>3 AI trips</p>
        </div>

        <div className="border p-6 rounded-xl mt-5 bg-black text-white">
          <h2>Pro - $9.9/mo</h2>
          <p>Unlimited AI travel planning</p>
          <button onClick={() => window.location.href = "/api/stripe/checkout"}>
            Upgrade
          </button>
        </div>
      </div>
    </div>
  );
}