export const defaultRule = {
	field: '',
	operator: '=', // =, !=, *, !*
	value: '', // mixed
	type: 'string', // data type, string or number
};

export const defaultGroup = {
	include: 'all', // ANY, ALL, NONE
	rules: [
		defaultRule
	],
};

export const defaultAudience = {
	include: 'any', // ANY, ALL, NONE
	groups: [
		defaultGroup,
	],
};
