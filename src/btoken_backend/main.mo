import BtokenLedger "canister:btoken_icrc1_ledger_canister";  
import Principal "mo:base/Principal";     
import Result "mo:base/Result";
import Error "mo:base/Error";

actor Btoken {

    type TransferArgs = {
        amount : Nat;
        toAccount : BtokenLedger.Account;
    };

    // Obter o nome do token
    public func getTokenName() : async Text {
        let name = await BtokenLedger.icrc1_name();
        return name;
    };

    // Obter o símbolo do token
    public func getTokenSymbol() : async Text {
        let symbol = await BtokenLedger.icrc1_symbol();
        return symbol;
    };

    // Obter o supply cap
    public func getTokenTotalSupply() : async Nat {
        let totalSupply = await BtokenLedger.icrc1_total_supply();
        return totalSupply;
    };    

    /* Obter o principal da identidade definida com Mint. 
        Ela pode ser utilizada para cunhar novos tokens ou para queimar tokens
    */
    public func getTokenMintingPrincipal() : async Text {
        let mintingAccountOpt = await BtokenLedger.icrc1_minting_account();
    
        switch (mintingAccountOpt) {
            case (null) { return "Nenhuma conta de mintagem localizada!"; };
            case (?account) { 
                // Converte o principal para texto
                return Principal.toText(account.owner);
            };
        };
    };        

    /* transferir da ledger do Canister para outra conta */
    public shared func transfer(args : TransferArgs) : async Result.Result<BtokenLedger.BlockIndex, Text> {
    
        let transferArgs : BtokenLedger.TransferArg = {
          memo = null;
          amount = args.amount;
          from_subaccount = null;
          fee = null;
          to = args.toAccount;
          created_at_time = null;
        };

        try {
          let transferResult = await BtokenLedger.icrc1_transfer(transferArgs);

          switch (transferResult) {
            case (#Err(transferError)) {
              return #err("Não foi possível transferir fundos:
" # debug_show (transferError));
            };
            case (#Ok(blockIndex)) { return #ok blockIndex };
          };
        } catch (error : Error) {
          return #err("Mensagem de rejeição: " # Error.message(error));
        };
    };

    public query func getCanisterPrincipal() : async Text {
        return Principal.toText(Principal.fromActor(Btoken));
    };

    public func getCanisterBalance() : async Nat {
        let owner = Principal.fromActor(Btoken);
        let balance = await getBalance(owner);      
        return balance;
    };
    
    public func getBalance(owner: Principal) : async Nat {
        let balance = await BtokenLedger.icrc1_balance_of({ owner = owner; subaccount = null });      
        return balance;
    };

    public shared(msg) func transferFrom(to: Principal, amount: Nat) : async Result.Result<BtokenLedger.BlockIndex, Text> {
      let transferFromArgs : BtokenLedger.TransferFromArgs = {
                    spender_subaccount = null;
                    from = { owner = msg.caller; subaccount = null };                                                              
                    to = { owner = to; subaccount = null };                                                              
                    amount = amount;
                    fee = null;
                    memo = null;
                  created_at_time = null; };
      try {
          let transferResult = await BtokenLedger.icrc2_transfer_from(transferFromArgs);
          switch (transferResult) {
              case (#Err(transferError)) {
                return #err("Não foi possível transferir fundos:\n" # debug_show (transferError));
              };
              case (#Ok(blockIndex)) { return #ok blockIndex };
          };
      } catch (error : Error) {
          return #err("Mensagem de rejeição: " # Error.message(error));
      };
    };

}; 