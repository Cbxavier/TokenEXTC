import { btoken_backend } from 'declarations/btoken_backend';
import { btoken_icrc1_ledger_canister } from 'declarations/btoken_icrc1_ledger_canister';
import React, { useState, useEffect } from 'react';
import { HttpAgent, Actor } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import { Principal } from '@dfinity/principal'; //import necessário para trabalhar com Principal no frontend

function TransferFormICRC2() {

  /*Constante utilizada para guardar o principal do canister backend.
    Ele deverá ser autorizado para realizar as transferências em nome de terceiros */
  const [principalCanisterBackend, setPrincipalCanisterBackend] = useState('');
  //Constante utilizada para guardar o principal da conta de origem
  const [from, setFrom] = useState('');
  //Constante utilizada para guardar o principal da conta de destino
  const [to, setTo] = useState('');
  //Constante utilizada para guardar a quantidade a ser transferida
  const [amount, setAmount] = useState('');
  //Constante utilizada para guardar o saldo de tokens da conta de origem
  const [balancesFrom, setBalancesFrom] = useState(0);
  //Constante utilizada para guardar o saldo de tokens da conta de destino
  const [balancesTo, setBalancesTo] = useState(0);
  //Constante utilizada para exibir mensagens
  const [message, setMessage] = useState('');
 
  useEffect(() => {        
    const init = async () => {
        await getCanisterPrincipal();        
    }
    init();
  }, []);

  // função utilizada para obter o principal do canister de backend
  async function getCanisterPrincipal(){
    const result = await btoken_backend.getCanisterPrincipal();
    setPrincipalCanisterBackend(result);
  };
 
  /* Esta função permite que a identidade da conta de origem autorize, no canister de ledger, outro canister a gastar tokens
     em seu nome. Para realizar essa autorização, o usuário precisa estar autenticado na rede ICP.
  */
  async function approveTokens(am) {    
    // Crie os argumentos para a aprovação
    const approveArgs = {
      spender: {
        owner: Principal.fromText(principalCanisterBackend), //será aprovado o canister de backend
        subaccount: [] // Este campo é obrigatório, mesmo que seja nulo
      },
      amount: BigInt(am) + BigInt(10000), // é somado 10000 para considerar a taxa do Fee, neste caso será cobrada da conta de origem
      fee: [], // ao não definir o Fee será utilizado o Fee padrão da ledger
      memo: [], // opcional
      from_subaccount: [], // opcional
      created_at_time: [], // opcional
      expected_allowance: [], // opcional
      expires_at: [] // opcional
    };
 
    try {
      /*
         Chama a função de aprovação do canister da ledger. O canister do ledger deverá estar previamente
         configurado com a identidade da conta de origem (isso é feito na função login).
      */
      const result = await btoken_icrc1_ledger_canister.icrc2_approve(approveArgs);    
      console.log("Aprovação bem-sucedida!");
      return result;
    } catch (error) {    
      setMessage("Erro na aprovação: " + error);    
    }
  }

  /* Função utilizada para autenticar o usuário utilizando o Internet Indetity */
  async function login() {
   
      const authClient = await AuthClient.create();      
      if (!authClient) throw new Error("AuthClient não inicializado");

      // Inicia o processo de login e aguarda até que ele termine
      await authClient.login({
          /* Redireciona para o provedor de identidade da ICP (Internet Identity).
             Neste caso a autenticação será realizada em ambiente Local.
          */ 
          identityProvider: `http://${process.env.CANISTER_ID_INTERNET_IDENTITY}.localhost:4943`,        
          //identityProvider: "https://identity.ic0.app/#authorize", // Este código deverá ser utilizado apenas em caso de deploy em mainnet ou playgroud

          onSuccess: async () => {  
              // Caso entrar neste bloco significa que a autenticação ocorreu com sucesso!  
           
              //registra a identidade do usuário no Canister de backend
              Actor.agentOf(btoken_backend).replaceIdentity(
                  authClient.getIdentity()
              );  

              //registra a identidade do usuário no Canister de ledger
              Actor.agentOf(btoken_icrc1_ledger_canister).replaceIdentity(
                  authClient.getIdentity()
              );              
              //atualiza os dados da conta de origem
              setFrom(authClient.getIdentity().getPrincipal().toText());
              getAccountFromBalance(authClient.getIdentity().getPrincipal().toText());              
          },
       
          windowOpenerFeatures: ` left=${window.screen.width / 2 - 525 / 2},
                                  top=${window.screen.height / 2 - 705 / 2},
                                  toolbar=0,location=0,menubar=0,width=525,height=705 `,
      });
  }
 
  // função utilizada para obter o saldo de tokens da conta de origem
  async function getAccountFromBalance(account) {
   
    try {
        if (account != '') {                        
            setFrom(account);
            const result = await btoken_backend.getBalance(Principal.fromText(account));
            setBalancesFrom(parseInt(result));  
            setMessage('');
        }
    } catch (error) {
        console.dir(error);
        console.log(error.message);        
        setBalancesFrom(0);  
        setMessage('Ocorreu uma falha ao retornar o saldo da Conta de Origem');
    }
  }

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
        setMessage('Ocorreu uma falha ao retornar o saldo da Conta de Destino');
    }
  }  

  // Esta função irá executar a transferência de tokens da conta de origem para a conta de destino
  async function transferTokens() {        
       
    if (!from || !to || !amount) {
        setMessage('Por favor, preencha todos os campos');
        return;
    }

    try {
       
        /* Antes de executar a transferência, é necessário aprovar o canister de backend para que ele possa realizar a operação.
           Mesmo que a transferência não seja concluída por falta de saldo, a chamada de aprovação consome uma taxa fixa de 10.000 tokens.
           Para evitar o consumo desnecessário dessa taxa, recomenda-se verificar previamente o saldo da conta de origem.
           Como alternativa, é possível aprovar um valor maior de uma só vez e realizar múltiplas transferências posteriormente,
           utilizando apenas uma única taxa de aprovação. */          
        await approveTokens(amount);        

        /* Caso for necessário checar a quantidade que foi aprovado  pode ser utilizado o código abaixo */
        /*
        const allowance = await btoken_icrc1_ledger_canister.icrc2_allowance({
          account: { owner: Principal.fromText(from), subaccount: [] },
          spender: { owner: Principal.fromText('bkyz2-fmaaa-aaaaa-qaaaq-cai'), subaccount: [] }
        });
        console.log("Allowance atual:", allowance);
        */
       
        /* Executa a função transferFrom no backend para realizar a transferência.
           A operação será concluída apenas se a aprovação prévia tiver sido bem-sucedida e se a conta de origem possuir
           saldo igual ou superior a quantidade aprovada. */
        const result = await btoken_backend.transferFrom(Principal.fromText(to), BigInt(amount)); // esta operação consome 10000 tokens (operação de aprovação e transferencia juntas custam 20000)
       
        // Processa o resultado
        if ('ok' in result) {            
            setAmount('');
            setMessage(`Transferência concluída! Bloco: ${result.ok.toString()}`);
            await getAccountFromBalance(from);
            await getAccountToBalance(to);
        } else {                      
            setMessage("Erro na transferência: " + result.err);                        
        }                
       
    } catch (error) {
        console.log(error);
        setMessage(`Erro: ${error.message}`);            
    }    
  }

  return (
    <div className="transfer-container">
      <h2>Transferência de Tokens (Entre Contas)</h2>

      <div className="input-group">
        <label>Conta Origem (From)</label>      
        <div className="inline-fields">
          <input value={from} readOnly />
          <a onClick={login} className="btn-login">Internet Identity</a>
        </div>        
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
        Aprovar e Transferir
      </button>
      {message && <p className="message">{message}</p>}
    </div>
  );
}

export default TransferFormICRC2;