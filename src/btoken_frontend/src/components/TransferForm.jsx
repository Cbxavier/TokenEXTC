import { btoken_backend } from 'declarations/btoken_backend';
import React, { useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal'; //import necessário para trabalhar com Principal no frontend

function TransferForm() {

  //constante utilizada para guardar o principal da conta de origem (id do canister de backend)
  const [from, setFrom] = useState('');
  //constante utilizada para guardar o principal da conta de destino
  const [to, setTo] = useState('');
  //constante utilizada para guardar a quantidade a ser transferida
  const [amount, setAmount] = useState('');
  //constante utilizada para guardar o saldo de tokens da conta de origem
  const [balancesFrom, setBalancesFrom] = useState(0);
  //constante utilizada para guardar o saldo de tokens da conta de destino
  const [balancesTo, setBalancesTo] = useState(0);
  //constante utilizada para exibir mensagens
  const [message, setMessage] = useState('');
 
  useEffect(() => {    
    const init = async () => {
        await getCanisterPrincipal();
        await getCanisterBalance();
    }
    init();

  }, []);

  // função utilizada para obter o principal do canister de backend
  async function getCanisterPrincipal(){
    const result = await btoken_backend.getCanisterPrincipal();
    setFrom(result);
  };

  // função utilizada para obter o saldo de tokens do canister de backend
  async function getCanisterBalance(){
    const result = await btoken_backend.getCanisterBalance();
    setBalancesFrom(parseInt(result));  
  };

  // função utilizada para obter o saldo de tokens da conta de destino
  async function getAccountToBalance(account) {
   
    try {
        if (account != '') {                        
            setTo(account);
            const result = await btoken_backend.getBalance(Principal.fromText(account));
            setBalancesTo(parseInt(result));  
            setMessage('');
        }
    } catch (error) {
        console.dir(error);
        console.log(error.message);        
        setBalancesTo(0);  
        setMessage('Ocorreu uma falha ao retornar o saldo da Conta Destino');
    }

  }  

  // Função para criar o objeto TransferArgs, necessário para realizar a transferência de tokens
  function createTransferArgs(recipientPrincipal, amount) {
    return {
      amount: BigInt(amount), // Converte para BigInt para lidar com números grandes
      toAccount: {
        owner: Principal.fromText(recipientPrincipal),
        subaccount: [] // Opcional, pode ser null se não estiver usando subcontas
      }
    };
  }

  // Função para executar a transferência de tokens da conta de origem para a conta de destino
  async function transferTokens() {        
       
    if (!to || !amount) {
        setMessage('Por favor, preencha todos os campos');
        return;
    }
           
    try {
       
        // Cria o objeto TransferArgs
        const transferArgs = createTransferArgs(to, amount);
       
        // Chama o método transfer do backend        
        const result = await btoken_backend.transfer(transferArgs);
       
        // Processa o resultado
        if ('ok' in result) {
            console.log("Transferência bem-sucedida! Bloco:", result.ok.toString());            
            setAmount('');
            setMessage(`Transferência concluída! Bloco: ${result.ok.toString()}`);
            await getCanisterBalance();
            await getAccountToBalance(to);
        } else {
            console.error("Erro na transferência:", result.error);            
            setMessage("Erro na transferência: " + result.error);                        
        }               
       
    } catch (error) {
        setMessage(`Erro: ${error.message}`);            
    }
     
  }

  return (
    <div className="transfer-container">
      <h2>Transferência de Tokens (Canister Backend)</h2>

      <div className="input-group">
        <label>Conta Origem (From) - Id do Canister</label>
        <label>{from}</label>
        <p className="balance">Saldo: {balancesFrom} tokens</p>
      </div>

      <div className="input-group">
        <label>Conta Destino (To)</label>
        <input value={to} onChange={(e) => getAccountToBalance(e.target.value)} />
        <p className="balance">Saldo: {balancesTo} tokens</p>
      </div>

      <div className="input-group">
        <label>Quantidade</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="0"
        />
      </div>

      <button className="btn-transfer" onClick={transferTokens}>
        Transferir
      </button>

      {message && <p className="message">{message}</p>}
    </div>
  );
}

export default TransferForm;