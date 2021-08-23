export const defaultRule = {
	field: '',
	operator: '=', // =, !=, *, !*
	value: '', // mixed
	type: 'string', // data type, string or number
};

export const defaultGroup = {
	include: 'any', // ANY, ALL, NONE
	rules: [
		defaultRule,
	],
};

export const defaultAudience = {
	include: 'all', // ANY, ALL, NONE
	groups: [
		defaultGroup,
	],
};

export const defaultPost = {
	title: {
		rendered: '',
		raw: '',
	},
	audience: defaultAudience,
	status: 'draft',
};
