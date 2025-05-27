import React from "react";

function TokenCard({ name, symbol, fee, supply, minter }) {
  return (
    <div className="token-card">
      <h2 className="token-name">{name}</h2>      
      <div className="token-info">
        <span className="token-info-label">Symbol:</span>
        <span className="token-info-value">{symbol}</span>
      </div>
      <div className="token-info">
        <span className="token-info-label">Fee:</span>
        <span className="token-info-value">{fee}</span>
      </div>
      <div className="token-info">
        <span className="token-info-label">Total Supply:</span>
        <span className="token-info-value">{supply}</span>
      </div>
      <div className="token-info">
        <span className="token-info-label">Principal do Minter:</span>
        <span className="token-info-value">{minter}</span>
      </div>
    </div>
  );
}

export default TokenCard; 