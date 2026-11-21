// Decoders for the read-only simulation payload returned by Soroban RPC.
//
// Like the rest of the XDR helpers, this stays on the server side of the
// server-action boundary: the SDK's XDR machinery never reaches the browser.
import { Address, xdr } from "@stellar/stellar-sdk";
import type { ContractEvent, SimulationFootprint } from "@/types";
import { scValToDisplay } from "./display";

/**
 * Describe one authorized call tree — the root call plus any nested
 * sub-invocations a contract forwards on the signer's behalf.
 */
function describeAuthorizedInvocation(inv: xdr.SorobanAuthorizedInvocation): string {
  try {
    const fn = inv.function();
    let call: string;
    if (fn.switch().name === "sorobanAuthorizedFunctionTypeContractFn") {
      const args = fn.contractFn();
      const address = Address.fromScAddress(args.contractAddress()).toString();
      const name = args.functionName().toString();
      const renderedArgs = args.args().map(scValToDisplay).join(", ");
      call = `${address}.${name}(${renderedArgs})`;
    } else {
      call = fn.switch().name;
    }
    const subs = inv.subInvocations();
    return subs.length === 0
      ? call
      : `${call} → ${subs.map(describeAuthorizedInvocation).join(" → ")}`;
  } catch {
    return "(unparseable invocation)";
  }
}

/**
 * Turn simulation `result.auth` entries into lines of the form
 * "address X authorizes contract.fn(args)", including nested calls.
 */
export function describeAuthorizations(auth: xdr.SorobanAuthorizationEntry[]): string[] {
  return auth.map((entry) => {
    try {
      const credentials = entry.credentials();
      const kind = credentials.switch().name;
      let signer = "source account";
      if (kind === "sorobanCredentialsAddress") {
        signer = Address.fromScAddress(credentials.address().address()).toString();
      } else if (kind === "sorobanCredentialsAddressV2") {
        signer = Address.fromScAddress(credentials.addressV2().address()).toString();
      } else if (kind === "sorobanCredentialsAddressWithDelegates") {
        signer = Address.fromScAddress(
          credentials.addressWithDelegates().addressCredentials().address()
        ).toString();
      }
      return `${signer} authorizes ${describeAuthorizedInvocation(entry.rootInvocation())}`;
    } catch {
      return "(unparseable authorization)";
    }
  });
}

/**
 * Decode the contract events a simulation emitted. Diagnostic events also
 * contain system/diagnostic entries, which we drop — only `contract` events
 * are meaningful to the Explorer's event log.
 *
 * A simulation has no transaction hash, ledger or close time, so those fields
 * are left empty; EventLog is told not to render them for simulated events.
 */
export function decodeSimulationEvents(
  diagnostics: xdr.DiagnosticEvent[],
  fallbackContractId: string
): ContractEvent[] {
  const events: ContractEvent[] = [];
  diagnostics.forEach((diagnostic, i) => {
    try {
      const event = diagnostic.event();
      if (event.type().name !== "contract") return;
      const body = event.body().v0();
      const contractId = event.contractId()
        ? Address.contract(event.contractId() as unknown as Buffer).toString()
        : fallbackContractId;
      events.push({
        id: `sim-${i}`,
        contractId,
        type: event.type().name,
        topic: body.topics().map(scValToDisplay),
        value: scValToDisplay(body.data()),
        txHash: "",
        ledger: 0,
        timestamp: "",
      });
    } catch {
      // A single malformed diagnostic event shouldn't hide the rest.
    }
  });
  return events;
}

/** Render a footprint ledger key as a short, readable description. */
export function describeLedgerKey(key: xdr.LedgerKey): string {
  try {
    const type = key.switch().name;
    if (type === "contractData") {
      const data = key.contractData();
      return `${Address.fromScAddress(data.contract()).toString()} / ${scValToDisplay(data.key())}`;
    }
    if (type === "contractCode") {
      return `wasm ${key.contractCode().hash().toString("hex")}`;
    }
    if (type === "account") {
      return Address.account(Buffer.from(key.account().accountId().ed25519())).toString();
    }
    return type;
  } catch {
    return key.switch().name;
  }
}

/** Decode a simulation's Soroban resources into the figures the UI displays. */
export function decodeSimulationFootprint(resources: xdr.SorobanResources): SimulationFootprint {
  const footprint = resources.footprint();
  return {
    readOnly: footprint.readOnly().map(describeLedgerKey),
    readWrite: footprint.readWrite().map(describeLedgerKey),
    readBytes: resources.diskReadBytes(),
    writeBytes: resources.writeBytes(),
  };
}
