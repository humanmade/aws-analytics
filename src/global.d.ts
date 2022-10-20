declare interface Window {
	AltisAccelerateDashboardData: {
		post_types: {
			name: string,
			label: string,
			singular_label: string,
		}[],
		version: string,
		page: string,
		tracking: {
			opt_in: boolean,
		},
		user: {
			id?: number,
			name: string,
		},
		id?: number,
		welcomed: boolean,
	};
	analytics: any;
}
