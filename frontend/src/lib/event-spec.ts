// Matching emitted events against the declarations in a contract's spec.
//
// Deliberately free of runtime imports: the event log renders inside a client
// component, and these helpers work on already-decoded strings, so there's no
// reason to pull stellar-sdk's XDR machinery into the browser bundle. The type
// import below is erased at compile time.
import type { ParsedEventSpec } from "./xdr";

/**
 * Find the declaration an emitted event's topics correspond to.
 *
 * Events are matched on their fixed prefix topics, which is the only part of an
 * event guaranteed identical across every instance. The topic count has to
 * match the declaration exactly too — same prefix with a different arity is a
 * different event, not this one.
 */
export function matchEventSpec(
  topics: string[],
  specs: ParsedEventSpec[]
): ParsedEventSpec | undefined {
  return specs.find((spec) => {
    const topicParams = spec.params.filter((p) => p.location === "topic").length;
    if (topics.length !== spec.prefixTopics.length + topicParams) return false;
    return spec.prefixTopics.every((topic, i) => topics[i] === topic);
  });
}

/**
 * Pair an emitted event's topics with the names its declaration gives them.
 * The fixed prefix topics are dropped — they're the event's name, shown
 * separately — leaving only the fields that vary per instance.
 */
export function labelEventTopics(
  topics: string[],
  spec: ParsedEventSpec
): { name: string; type: string; value: string }[] {
  return spec.params
    .filter((p) => p.location === "topic")
    .map((param, i) => ({
      name: param.name,
      type: param.type,
      value: topics[spec.prefixTopics.length + i] ?? "",
    }));
}
