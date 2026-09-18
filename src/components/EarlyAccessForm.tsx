"use client";

export default function EarlyAccessForm() {
  return (
    <form
      className="mt-10 grid sm:grid-cols-2 gap-4 text-left"
      onSubmit={(e) => {
        e.preventDefault();
        alert("Request submitted (demo).");
      }}
    >
      <div>
        <label htmlFor="waName" className="text-xs text-neutral-500 font-geist mb-1.5 block">
          Name
        </label>
        <input
          id="waName"
          type="text"
          placeholder="Your Name"
          className="w-full bg-white border border-neutral-200 focus:border-green-600 rounded-lg px-4 py-2.5 text-sm font-geist placeholder:text-neutral-400 text-neutral-900"
        />
      </div>
      <div>
        <label htmlFor="waWallet" className="text-xs text-neutral-500 font-geist mb-1.5 block">
          Wallet Address
        </label>
        <input
          id="waWallet"
          type="text"
          placeholder="0x... or ENS"
          className="w-full bg-white border border-neutral-200 focus:border-green-600 rounded-lg px-4 py-2.5 text-sm font-geist placeholder:text-neutral-400 text-neutral-900"
        />
      </div>
      <div>
        <label htmlFor="waProvider" className="text-xs text-neutral-500 font-geist mb-1.5 block">
          Primary Wallet
        </label>
        <select
          id="waProvider"
          className="w-full bg-white border border-neutral-200 focus:border-green-600 rounded-lg px-4 py-2.5 text-sm font-geist text-neutral-700"
        >
          <option>Select Wallet</option>
          <option>MetaMask</option>
          <option>Rabby</option>
          <option>Robinhood Wallet</option>
          <option>Other EVM Wallet</option>
        </select>
      </div>
      <div>
        <label htmlFor="waDesiredName" className="text-xs text-neutral-500 font-geist mb-1.5 block">
          Desired Name
        </label>
        <input
          id="waDesiredName"
          type="text"
          placeholder="e.g. maya.mail"
          className="w-full bg-white border border-neutral-200 focus:border-green-600 rounded-lg px-4 py-2.5 text-sm font-geist placeholder:text-neutral-400 text-neutral-900"
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="waDetails" className="text-xs text-neutral-500 font-geist mb-1.5 block">
          What will you use it for?
        </label>
        <textarea
          id="waDetails"
          rows={4}
          placeholder="DAO coordination, trading group, project updates..."
          className="w-full bg-white border border-neutral-200 focus:border-green-600 rounded-lg px-4 py-2.5 text-sm font-geist placeholder:text-neutral-400 text-neutral-900 resize-none"
        />
      </div>
      <div className="sm:col-span-2">
        <button
          type="submit"
          className="w-full sm:w-auto inline-flex items-center gap-2 justify-center bg-green-600 text-white font-medium text-sm font-geist px-6 py-3 rounded-full hover:bg-green-700 transition"
        >
          Request Access
          <ArrowRightIcon />
        </button>
      </div>
    </form>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
