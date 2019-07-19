import React, { Fragment } from 'react';
import DatesField from './field-dates';
import TitleTextField from './field-title-text';
import TrafficPercentageField from './field-traffic-percentage';
import PauseField from './field-pause';
import Results from './results';
import styled from 'styled-components';

const { PluginSidebar, PluginSidebarMoreMenuItem } = wp.editPost;
const { registerPlugin } = wp.plugins;
const { __ } = wp.i18n;
const {
	Panel, PanelBody, PanelRow
} = wp.components;

const PanelRowInner = styled.div`
.components-base-control__help { margin-top: 5px; color: #666; }
`

registerPlugin('hm-analytics-ab-test', {
	title: __('Experiments'),
	icon: 'lightbulb',
	render() {
		return (
			<Fragment>
				<PluginSidebarMoreMenuItem
					target="hm-analytics-ab-test"
				>
					{ __('Experiments') }
				</PluginSidebarMoreMenuItem>
				<PluginSidebar
					name="hm-analytics-ab-test"
					title={__('Experiments')}
				>
					<Panel>
						<PanelBody
							title={__('Post Titles')}
							icon="editor-paragraph"
							initialOpen={true}
						>
							<PanelRow>
								<PanelRowInner>
									<Results />
								</PanelRowInner>
							</PanelRow>
							<PanelRow>
								<PanelRowInner>
									<PauseField />
								</PanelRowInner>
							</PanelRow>
							<PanelRow>
								<PanelRowInner>
									<p>{__('Add multiple post titles and see how each performs in real time.')}</p>
									<p>{__('To get started fill out the title fields below.')}</p>
									<TitleTextField />
								</PanelRowInner>
							</PanelRow>
							<PanelRow>
								<PanelRowInner>
									<TrafficPercentageField />
								</PanelRowInner>
							</PanelRow>
							<PanelRow>
								<PanelRowInner>
									<DatesField
										name="start_time"
										label={__('Start date')}
									/>
								</PanelRowInner>
							</PanelRow>
							<PanelRow>
								<PanelRowInner>
									<DatesField
										name="end_time"
										label={__('End date')}
										defaultValue={Date.now() + (30 * 24 * 60 * 60 * 1000)}
									/>
								</PanelRowInner>
							</PanelRow>
						</PanelBody>
					</Panel>
				</PluginSidebar>
			</Fragment>
		)
	},
} );
