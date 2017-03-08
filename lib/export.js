// export SHR specification content as a hierarchy in JSON format
// Author: Greg Quinn
// The exportToJSON function produces a JSON object representing all the SHR content provided as input in a hierarchal form. Each node
// has a label, type, and children attribute. If label is omitted, the node is anonymous. The type attribute must always exist though.
// If children is omitted, the node is a leaf (no children).
// Some types of nodes can have additional attributes as appropriate to their type.
// In the representation below, the children attribute is shown by indented node(s) on the next numbered line(s). Note that each numbered line
// represents a type of node and can be repeated 0 to many times (except the root SHR node which there is only 1 of).
// If a node (numbered line) has 2 or more indented nodes under it, then it can have multiple types of nodes as children. Note that each of those
// may have children too so its all the numbered lines under it that are one indent level in that represent the possible types of children of a node.

// Attribute values like <x> mean that x is the label of the attribute on the JSON object in models.js that is the value of the attribute. The type
// attribute corresponds to the JSON object in models.js.
// More complicated value expressions like:
//   <identifier.namespace>":"<identifier.name>
// This means the value of the namespace attribute of identifier followed by a colon then the value of the name attribute  of identifier.

// When an attribute value is *Type, that's a reference to one of the Types at the end of the hierarchy which specifies the format of that JSON
// object. Often it will be "*Type1 or Type2" which means the value of that attribute can be Type1 or Type2 so see the definition of *Type1 and
// *Type2.
// Each line starts with a number representing its level in the hierarchy. Long node specifications are continued on the next line indented without a number

// 1{ label: SHR, type: SHR}
//   2{ label: Namespaces, type: Namespaces}
//		3{  label: <namespace>, type: "Namespace", description: <description>, grammarVersion: *Version or [ *Version, ... ] }
//			4{  label: <identifier.name>, type: "DataElement", isEntry: <isEntry>, concepts: *Concepts, description: <description>,
//				basedOn: *Identifiers, value: *Value }
//				5 *Value
//   2{ label: ValueSets, type:ValueSets}
//      3{ 	label: <identifier.name>, type: "ValueSet", namespace: <identifier.namespace>, description: <description>, url: <url>, 
//			concepts: *Concepts, grammarVersion: *Version }
//			4{ label: <code.display> if exists or <code.code>, type: <constructor.name>, code: *Code }

// *Value				= *ChoiceValue or *RefValue or *IdentifiableValue or *TBD or IncompleteValue
// *ChoiceValue			= { type:"ChoiceValue", min: <card.min>, max: <card.max> but if max=* then this attribute left out,
//							constraints:*Constraints, value: [ *Value ] }
// *RefValue   			= { type:"RefValue", min: <card.min>, max: <card.max> but if max=* then this attribute left out,
//							constraints:*Constraints, label:"reference to "<identifier.namespace>":"<identifier.name>,
//							identifier: *Identifier }
// *IdentifiableValue 	= { type:"IdentifiableValue", min: <min>, max: <max> but if max=* then this attribute left out,
//							constraints:*Constraints,
//							label:<identifier.namespace>":"<identifier.name>, identifier: *Identifier }
// *TBD					= { type:"TBD", min: <min>, max: <max> but if max=* then this attribute left out,
//							constraints:*Constraints,
//							text:<text> }
// *IncompleteValue		= { type:"Incomplete", min: <min>, max: <max> but if max=* then this attribute left out,
//							constraints:*Constraints }
// *Constraints			= [ *Constraint ]
// *Constraint			= *ValueSetConstraint or *CodeConstraint or *TypeConstraint or *CardConstraint
// *ValueSetConstraint 	= { type="ValueSetConstraint", valueset=<valueSet>, path=<path> as string with : separator }
// *CodeConstraint		= { type="CodeConstraint", code=<code>, path=<path> as string with : separator }
// *IncludesCodeConstraint= { type="IncludesCodeConstraint", code=<code>, path=<path> as string with : separator }
// *TypeConstraint 		= { type="TypeConstraint", isA=<isA>, path=<path> as string with : separator }
// *BooleanConstraint	= { type="BooleanConstraint", value=<value>, path=<path> as string with : separator }
// *CardConstraint		= { type="CardConstraint", min=<card.min>, max=<card.max> unless unbounded,
//							path=<path> as string with : separator }
// *Identifiers			= [ *Identifier ]
// *Identifier			= { label: <name>, type: "Identifier", namespace: <namespace> }
// *Concepts			= [ *Concept ]
// *Concept				= { label: <display>" "(<system>":"<code>) else <system>":"<code>, type: "Concept", system: <system>,
//							code: <code>, display:<display>, url: <url for concept> }
// *Version				= { major:<major>, minor:<minor>, patch:<patch> }
// *Code				= 

const {IdentifiableValue, RefValue, ChoiceValue, TBD, IncompleteValue, ValueSetConstraint, IncludesCodeConstraint, CodeConstraint, CardConstraint, TypeConstraint} = require('shr-models');

// *SHR
function exportToJSON(specifications) {
// 1{ label: SHR, type: SHR}
//   2{ label: Namespaces, type: Namespaces}
//		3{ label: <namespace>, type: "Namespace", description: <description>, grammarVersion: <grammarVersions> }
  const namespaceResults = [], valuesetResults = [], codeSystemResults = [];
  const errors = [];
  
  for (const ns of specifications.namespaces.all) {
	  namespaceResults.push( 
			  namespaceToHierarchyJSON(	ns,
					  					specifications.dataElements.byNamespace(ns.namespace),
					  					specifications.dataElements.grammarVersions, 
					  					errors )); // *Namespace
  }
  
  var valueSetsForNamespace;
  for (const ns of specifications.namespaces.all) {
	  
	  valueSetsForNamespace = valueSetsToHierarchyJSON(	ns,
			  											specifications.valueSets.byNamespace(ns.namespace),
			  											specifications.valueSets.grammarVersions,
			  											errors);
	  if (valueSetsForNamespace.length > 0) {
		  for (const item of valueSetsForNamespace) {
			  valuesetResults.push(item);
		  }
	  }
  }
  
  var codeSystemsForNamespace;
  for (const ns of specifications.namespaces.all) {
	  
	  codeSystemsForNamespace = codeSystemsToHierarchyJSON(	ns,
			  												specifications.codeSystems.byNamespace(ns.namespace),
			  												specifications.codeSystems.grammarVersions,
			  												errors);
	  if (codeSystemsForNamespace.length > 0) {
		  for (const item of codeSystemsForNamespace) {
			  codeSystemResults.push(item);
		  }
	  }
  }
  
  const shr = {
    label: 'SHR',
    type: 'SHR',
    children: [ {	label: 'Namespaces', 
    				type:'Namespaces', 
    				children: namespaceResults },
    			{	label: 'Value Sets',
    				type:'ValueSets',
    				children: valuesetResults },
    			{	label: 'Code Systems',
    				type: 'CodeSystems',
    				children: codeSystemResults }]
    };
  return {json: shr, errors: errors };
}

// { major:<major>, minor:<minor>, patch:<patch> }
function versionToHierarchyJSON(v) {
  return {
	major: v.major,
	minor: v.minor,
	patch: v.patch
  };
}

// *CodeSystems
function codeSystemsToHierarchyJSON(ns, codeSystems, grammarVersions, errors) {
	const result = [];
	
	for (const cs of codeSystems) {
		result.push(codeSystemToHierarchyJSON(cs, errors)); //*CodeSystem
	}
	return result;
}

// *CodeSystem
function codeSystemToHierarchyJSON(cs, errors) {
	//console.log(cs);
	var result = {};
	result['label'] = cs.identifier.name;
	result['namespace'] = cs.identifier.namespace;
	result['description'] = cs.description;
	result['type'] = 'CodeSystem';
	result['url'] = cs.url;
	if (cs.grammarVersion) result['grammarVersion'] = versionToHierarchyJSON(cs.grammarVersion);
	var codes = conceptsToHierarchyJSON(cs.codes);  // *Concepts
	if (codes.length > 0) {
		result['children'] = codes;
	}
	
	return result;
}


// *ValueSets
function valueSetsToHierarchyJSON(ns, valueSets, grammarVersions, errors) {
	const result = [];
	
	for (const vs of valueSets) {
		result.push(valueSetToHierarchyJSON(vs, errors)); //*ValueSet
	}
	return result;
}

//*ValueSet
function valueSetToHierarchyJSON(vs, errors) {
	//console.log(vs);
	var result = {};
	result['label'] = vs.identifier.name;
	result['namespace'] = vs.identifier.namespace;
	result['description'] = vs.description;
	result['type'] = 'ValueSet';
	result['url'] = vs.url;
	result['concepts'] = conceptsToHierarchyJSON(vs.concepts); // *Concepts
	if (vs.grammarVersion) result['grammarVersion'] = versionToHierarchyJSON(vs.grammarVersion);
	var rules = valueSetRulesToHierarchyJSON(vs.rules);
	if (rules.length > 0) {
		result['children'] = rules;
	}
	
	return result;
}

// *ValueSetRules
function valueSetRulesToHierarchyJSON(rules) {
	var result = [];
	for (const rule of rules) {
		result.push(	valueSetRuleToHierarchyJSON(rule));
	}
	return result;
}

// *ValueSetRule
function valueSetRuleToHierarchyJSON(rule) {
	var result = {};
	//console.log(rule.code);
	if (rule.code.display) {
		result["label"] = rule.code.display;
	} else {
		result["label"] = rule.code.code;
	}
	result["code"] = codeToHierarchyJSON(rule.code);
	result["type"] = rule.constructor.name;
	/*
	if (rule.constructor.name === "ValueSetIncludesCodeRule") {
	} else if (rule.constructor.name === "ValueSetIncludesDescendentsRule") {	 
	} else if (rule.constructor.name === "ValueSetExcludesDescendentsRule") {
	} else if (rule.constructor.name === "ValueSetIncludesFromCodeRule") {
	}*/
	return result;
}

// *Namespace
function namespaceToHierarchyJSON(ns, dataElements, grammarVersions, errors) {
//		3{ label: <namespace>, type: "Namespace", description: <description>, grammarVersion: <grammarVersions> }
//			4 *DataElement

  //console.info("**** NAMESPACE: " + ns.namespace);
  const definitions = [];

  let defs = dataElements.sort(function(l,r) {return l.identifier.name.localeCompare(r.identifier.name);});
  for (const def of defs) {
    definitions.push(definitionToHierarchyJSON(def, errors)); // *DataElement
  }
  
  var result = {};
  result['label'] = ns.namespace;
  result['type'] = 'Namespace';
  if (ns.description) {
	  result['description'] = ns.description;
  }
  
  if (grammarVersions.length > 0) {
	  result['grammarVersion'] = grammarVersionsToHierarchyJSON(grammarVersions, errors);
  }
  result['children'] = definitions;
  return result;
}

function grammarVersionsToHierarchyJSON(grammarVersions, errors) {
  var versions = undefined;
  if (grammarVersions.length > 0) {
	  if (grammarVersions.length === 1) {
		versions = versionToHierarchyJSON(grammarVersions[0]);
	  } else {
		versions = [];
		for (const v of grammarVersions) {
		  versions.push(versionToHierarchyJSON(v));
		}
	  }
  }
  return versions;
}

// *DataElement
function definitionToHierarchyJSON(def, errors) {
//	4{  label: <identifier.name>, type: "DataElement", isEntry: <isEntry>, concepts: *Concepts, description: <description>,
//		basedOn: *Identifiers, value: *Value }
//		5 *Value
  var result = {};
  result['type'] = 'DataElement';
  result['label'] = def.identifier.name;
  //console.info("DataElement: " + def.identifier.name);
  //result['identifier'] = identifierToHierarchyJSON(def.identifier);
  result['isEntry'] = def.isEntry;
  result['concepts'] = conceptsToHierarchyJSON(def.concepts); // *Concepts
  result['description'] = def.description;
  //result['grammarVersion'] = def.grammarVersion;
  if (def.grammarVersion) result['grammarVersion'] = versionToHierarchyJSON(def.grammarVersion);
  if (def.basedOn.length > 0) {
    result['basedOn'] = identifiersToHierarchyJSON(def.basedOn); // *Identifiers
  }
  if (def.value) {
    result['value'] = valueToHierarchyJSON(def.value, errors); // *Value
  }
  const children = [];
  for (const el of def.fields) {
    children.push(valueToHierarchyJSON(el, errors)); // *Value
  }
  result['children'] = children;
  return result;
}

// *Identifiers
function identifiersToHierarchyJSON(identifiers) {
// [ *Identifier ]
  const result = [];
  for (const identifier of identifiers) {
    result.push(identifierToHierarchyJSON(identifier)); // *Identifier
  }
  return result;
}

// *Concepts
function conceptsToHierarchyJSON(concepts) {
//  [ *Concept ]
  const result = [];

  if (concepts.length > 0) {
    for (const concept of concepts) {
      result.push(conceptToHierarchyJSON(concept));
    }
  }

  return result;
}

// *Value
function valueToHierarchyJSON(value, errors) {
  //	5 *Value
  // *Value				= *ChoiceValue or *RefValue or *IdentifiableValue or *TBD or IncompleteValue
  // *ChoiceValue			= { type:"ChoiceValue", min: <card.min>, max: <card.max> but if max=* then this attribute left out,
  //							constraints:*Constraints, value: [ *Value ] }
  // *RefValue   			= { type:"RefValue", min: <card.min>, max: <card.max> but if max=* then this attribute left out,
  //							constraints:*Constraints, label:"reference to "<identifier.namespace>":"<identifier.name>,
  //							identifier: *Identifier }
  // *IdentifiableValue 	= { type:"IdentifiableValue", min: <min>, max: <max> but if max=* then this attribute left out,
  //							constraints:*Constraints,
  //							label:<identifier.namespace>":"<identifier.name>, identifier: *Identifier }
  // *TBD					= { type:"TBD", min: <min>, max: <max> but if max=* then this attribute left out,
  //							constraints:*Constraints,
  //							text:<text> }
  // *IncompleteValue		= { type:"Incomplete", min: <min>, max: <max> but if max=* then this attribute left out,
  //							constraints:*Constraints }

  const result = {};
  const card = value.card;
  if (card) {
    result['min'] = card.min;
    if (!card.isMaxUnbounded) {
      result['max'] = card.max;
    }
  }
  // constraints
  result['constraints'] = constraintsToHierarchyJSON(value, errors); // *Constraints

  //console.info("Value type: " + value.constructor.name);
  if (value.constructor.name === "ChoiceValue") {
    result['type'] = 'ChoiceValue';
    result['value'] = choiceValuesToHierarchyJSON(value, errors);
  } else if (value.constructor.name === "RefValue") {
    result['type'] = 'RefValue';
    result['label'] = 'reference to ' + identifierToString(value.identifier);
    result['identifier'] = identifierToHierarchyJSON(value.identifier);
  } else if (value.constructor.name === "IdentifiableValue") {
    result['type'] = 'IdentifiableValue';
    result['label'] = identifierToString(value.identifier);
    result['identifier'] = identifierToHierarchyJSON(value.identifier);
  } else if (value.constructor.name === "TBD") {
    result['type'] = 'TBD';
    result['text'] = value.text;
  } else if (value.constructor.name === "IncompleteValue") {
    result['type'] = 'Incomplete';
  } else {
	  errors.push('Unknown type for value \'' + value.constructor.name + '\'');
	//console.error('Unknown type for value \'' + value.constructor.name + '\'');
    result['type'] = value.constructor.name;
  }
  return result;
}

// *Constraints
function constraintsToHierarchyJSON(value, errors) {
  // [ *Constraint ]
  const result = [];
  for (const constraint of value.constraints) {
    result.push(constraintToHierarchyJSON(constraint, errors));
  }

  return result;
}

// *Constraint
function constraintToHierarchyJSON(constraint, errors) {
  // *ValueSetConstraint or *CodeConstraint or *TypeConstraint or *CardConstraint
  // *ValueSetConstraint 	= { type="ValueSetConstraint", valueset=<valueSet>, path=<path> as string with : separator }
  // *CodeConstraint		= { type="CodeConstraint", code=<code>, path=<path> as string with : separator }
  // *IncludesCodeConstraint= { type="IncludesCodeConstraint", code=<code>, path=<path> as string with : separator }
  // *TypeConstraint 		= { type="TypeConstraint", isA=<isA>, path=<path> as string with : separator }
  // *BooleanConstraint		= { type="BooleanConstraint", value=<value>, path=<path> as string with : separator }
  // *CardConstraint		= { type="CardConstraint", min=<card.min>, max=<card.max> unless unbounded,
  //							path=<path> as string with : separator }
  const result = {};
  result['type'] = constraint.constructor.name;
  if (constraint.constructor.name === "ValueSetConstraint") {
    result['valueset'] = constraint.valueSet;
  } else if (constraint.constructor.name === "CodeConstraint") {
    result['code'] = conceptToHierarchyJSON(constraint.code); // *Concept
  } else if (constraint.constructor.name === "IncludesCodeConstraint") {
	result['code'] = conceptToHierarchyJSON(constraint.code); // *Concept
  } else if (constraint.constructor.name === "TypeConstraint") {
    result['isA'] = constraint.isA;
  } else if (constraint.constructor.name === "BooleanConstraint") {
	    result['value'] = constraint.value;
  } else if (constraint.constructor.name === "CardConstraint") {
    const card = constraint.card;
    if (card) {
      result['min'] = card.min;
      if (!card.isMaxUnbounded) {
        result['max'] = card.max;
      }
    }
  } else {
	  errors.push('Unknown type for constraint \'' + constraint.constructor.name + '\'');
    //console.error('Unknown type for constraint \'' + constraint.constructor.name + '\'');
  }
  result['path'] = constraint.path.map(p => p.toString()).join(':');
  //if (constraint.path.length > 0) {
  //	  console.info(result['path']);
  //}
  return result;
}

// *ChoiceValues
function choiceValuesToHierarchyJSON(value, errors) {
// [ *Value ]
  const valuesResult = [];
  for (const v of value.options) {
    valuesResult.push(valueToHierarchyJSON(v, errors)); // *Value
  }
  return valuesResult;
}

// *Code
function codeToHierarchyJSON(code) {
	var result = {};
	if (code.display) {
		result["label"] = code.display;
	}
	result["type"] = 'code';
	result["code"] = code.code;
	result["system"] = code.system;
	return result;
}

function conceptToString(concept) {
  if (concept.display) {
    return `${concept.display} (${concept.system}:${concept.code})`;
  } else {
    return `${concept.system}:${concept.code}`;
  }
}

// *Concept
function conceptToHierarchyJSON(concept) {
// *Concept				= { label: <display>" "(<system>":"<code>) else <system>":"<code>, type: "Concept", system: <system>, code: <code>, display:<display>, url: <url for concept> }
  const result = {};
  result['label'] = conceptToString(concept);
  result['type'] = 'Concept';
  result['system'] = concept.system;
  result['code'] = concept.code;
  result['display'] = concept.display;

  var url;
  switch (concept.system) {
  case 'http://uts.nlm.nih.gov/metathesaurus':
    url = `https://uts.nlm.nih.gov/metathesaurus.html?cui=${concept.code}`;
    break;
  case 'http://snomed.info/sct':
    url = `https://uts.nlm.nih.gov/snomedctBrowser.html?conceptId=${concept.code}`;
    break;
  case 'http://loinc.org':
    url = `http://s.details.loinc.org/LOINC/${concept.code}.html`;
    break;
  case 'http://unitsofmeasure.org':
    url = 'http://unitsofmeasure.org/ucum.html#section-Alphabetic-Index-By-Symbol';
    break;
  default:
    url = `${concept.system}/${concept.code}`;
  }
  result['url'] = url;
  return result;
}

function identifierToString(identifier) {
  return `${identifier.namespace}:${identifier.name}`;
}

// *Identifier
function identifierToHierarchyJSON(identifier) {
// { label: <name>, type: "Identifier", namespace: <namespace> }
  return { 	label: identifier.name,
      type: 'Identifier',
      namespace: identifier.namespace };
}

module.exports = {exportToJSON};