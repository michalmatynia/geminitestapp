export type ImageStudioDocKey =
  | 'crop_box_tool'
  | 'crop'
  | 'square_crop'
  | 'view_crop'
  | 'cancel_crop'
  | 'sidebar_copy_card_name'
  | 'sidebar_select_card_first'
  | 'sidebar_edit_card'
  | 'sidebar_duplicate_card'
  | 'sidebar_load_to_canvas'
  | 'sidebar_decanvas'
  | 'sidebar_new_card'
  | 'sidebar_new_folder'
  | 'object_layout_mode'
  | 'object_layout_padding'
  | 'object_layout_padding_axes'
  | 'object_layout_fill_missing_canvas_white'
  | 'object_layout_apply'
  | 'sequence_retries'
  | 'sequence_retry_backoff_ms'
  | 'sequence_crop_padding_percent'
  | 'sequence_mask_feather'
  | 'sequence_generate_output_count'
  | 'sequence_upscale_scale'
  | 'sequence_upscale_target_width'
  | 'sequence_upscale_target_height'
  | 'version_graph_merge_mode_toggle'
  | 'version_graph_merge_execute'
  | 'version_graph_merge_clear_selection'
  | 'version_graph_composite_mode_toggle'
  | 'version_graph_composite_execute'
  | 'version_graph_composite_clear_selection'
  | 'version_graph_compare_mode_toggle'
  | 'version_graph_collapse_all'
  | 'version_graph_expand_all'
  | 'version_graph_stats_toggle'
  | 'version_graph_minimap_toggle'
  | 'version_graph_export_png'
  | 'version_graph_layout_dag'
  | 'version_graph_layout_timeline_h'
  | 'version_graph_layout_timeline_v'
  | 'version_graph_zoom_out'
  | 'version_graph_zoom_in'
  | 'version_graph_fit_to_view'
  | 'version_graph_filter_search'
  | 'version_graph_filter_type_base'
  | 'version_graph_filter_type_generation'
  | 'version_graph_filter_type_merge'
  | 'version_graph_filter_type_composite'
  | 'version_graph_filter_mask_cycle'
  | 'version_graph_filter_leaf_toggle'
  | 'version_graph_filter_clear'
  | 'version_graph_inspector_open_details'
  | 'version_graph_inspector_flatten_composite'
  | 'version_graph_inspector_refresh_composite_preview'
  | 'version_graph_inspector_go_to_parent'
  | 'version_graph_inspector_focus_node'
  | 'version_graph_inspector_isolate_branch'
  | 'version_graph_inspector_copy_node_id'
  | 'version_graph_inspector_details_button'
  | 'version_graph_context_detach_subtree'
  | 'version_graph_context_isolate_new_card'
  | 'version_graph_context_toggle_collapse'
  | 'version_graph_context_add_to_composite'
  | 'version_graph_context_compare_with'
  | 'version_graph_context_copy_id'
  | 'version_graph_compare_open_details'
  | 'version_graph_compare_swap'
  | 'version_graph_compare_exit'
  | 'version_graph_node_toggle_collapse'
  | 'version_graph_node_open_details'
  | 'version_graph_isolation_clear';

export type ImageStudioDocEntry = {
  key: ImageStudioDocKey;
  title: string;
  description: string;
};

export const IMAGE_STUDIO_CROP_DOC_KEYS: ImageStudioDocKey[] = [
  'crop_box_tool',
  'crop',
  'square_crop',
  'view_crop',
  'cancel_crop',
];

export const IMAGE_STUDIO_OBJECT_LAYOUT_DOC_KEYS: ImageStudioDocKey[] = [
  'object_layout_mode',
  'object_layout_padding',
  'object_layout_padding_axes',
  'object_layout_fill_missing_canvas_white',
  'object_layout_apply',
];

export const IMAGE_STUDIO_SEQUENCE_DOC_KEYS: ImageStudioDocKey[] = [
  'sequence_retries',
  'sequence_retry_backoff_ms',
  'sequence_crop_padding_percent',
  'sequence_mask_feather',
  'sequence_generate_output_count',
  'sequence_upscale_scale',
  'sequence_upscale_target_width',
  'sequence_upscale_target_height',
];

export const IMAGE_STUDIO_VERSION_GRAPH_DOC_KEYS: ImageStudioDocKey[] = [
  'version_graph_merge_mode_toggle',
  'version_graph_merge_execute',
  'version_graph_merge_clear_selection',
  'version_graph_composite_mode_toggle',
  'version_graph_composite_execute',
  'version_graph_composite_clear_selection',
  'version_graph_compare_mode_toggle',
  'version_graph_collapse_all',
  'version_graph_expand_all',
  'version_graph_stats_toggle',
  'version_graph_minimap_toggle',
  'version_graph_export_png',
  'version_graph_layout_dag',
  'version_graph_layout_timeline_h',
  'version_graph_layout_timeline_v',
  'version_graph_zoom_out',
  'version_graph_zoom_in',
  'version_graph_fit_to_view',
  'version_graph_filter_search',
  'version_graph_filter_type_base',
  'version_graph_filter_type_generation',
  'version_graph_filter_type_merge',
  'version_graph_filter_type_composite',
  'version_graph_filter_mask_cycle',
  'version_graph_filter_leaf_toggle',
  'version_graph_filter_clear',
  'version_graph_inspector_open_details',
  'version_graph_inspector_flatten_composite',
  'version_graph_inspector_refresh_composite_preview',
  'version_graph_inspector_go_to_parent',
  'version_graph_inspector_focus_node',
  'version_graph_inspector_isolate_branch',
  'version_graph_inspector_copy_node_id',
  'version_graph_inspector_details_button',
  'version_graph_context_detach_subtree',
  'version_graph_context_isolate_new_card',
  'version_graph_context_toggle_collapse',
  'version_graph_context_add_to_composite',
  'version_graph_context_compare_with',
  'version_graph_context_copy_id',
  'version_graph_compare_open_details',
  'version_graph_compare_swap',
  'version_graph_compare_exit',
  'version_graph_node_toggle_collapse',
  'version_graph_node_open_details',
  'version_graph_isolation_clear',
];

export const IMAGE_STUDIO_DOCS: Record<ImageStudioDocKey, ImageStudioDocEntry> = {
  crop_box_tool: {
    key: 'crop_box_tool',
    title: 'Create Rectangle',
    description:
      'Creates a rectangle shape you can resize and move, then use as the crop boundary.',
  },
  crop: {
    key: 'crop',
    title: 'Crop',
    description:
      'Runs crop using the active boundary shape and creates a linked cropped output card.',
  },
  square_crop: {
    key: 'square_crop',
    title: 'Square Crop',
    description: 'Performs a quick centered 1:1 crop from the active source image.',
  },
  view_crop: {
    key: 'view_crop',
    title: 'View Crop',
    description: 'Crops to the currently visible preview viewport area shown on the canvas.',
  },
  cancel_crop: {
    key: 'cancel_crop',
    title: 'Cancel Crop',
    description: 'Stops the in-flight crop request and leaves the current source image unchanged.',
  },
  sidebar_copy_card_name: {
    key: 'sidebar_copy_card_name',
    title: 'Copy Card Name',
    description: 'Copies the selected card name (or ID) to the clipboard.',
  },
  sidebar_select_card_first: {
    key: 'sidebar_select_card_first',
    title: 'Select Card First',
    description: 'Select a card from the tree before using this action.',
  },
  sidebar_edit_card: {
    key: 'sidebar_edit_card',
    title: 'Edit Card',
    description: 'Opens inline card editor for the currently selected card.',
  },
  sidebar_duplicate_card: {
    key: 'sidebar_duplicate_card',
    title: 'Duplicate Card',
    description: 'Creates a copy of the selected card in the current project.',
  },
  sidebar_load_to_canvas: {
    key: 'sidebar_load_to_canvas',
    title: 'Load To Canvas',
    description: 'Loads the staged upload or selected card image into the active canvas slot.',
  },
  sidebar_decanvas: {
    key: 'sidebar_decanvas',
    title: 'De-canvas',
    description: 'Clears the currently loaded working card from canvas focus.',
  },
  sidebar_new_card: {
    key: 'sidebar_new_card',
    title: 'New Card',
    description: 'Creates a new card from the currently loaded source image.',
  },
  sidebar_new_folder: {
    key: 'sidebar_new_folder',
    title: 'New Folder',
    description: 'Creates a new folder in the active project tree.',
  },
  object_layout_mode: {
    key: 'object_layout_mode',
    title: 'Object Layout Mode',
    description:
      'Selects centering pipeline. Use Object Layouting modes to detect product bounds against white background and scale into frame.',
  },
  object_layout_padding: {
    key: 'object_layout_padding',
    title: 'Object Layout Padding (%)',
    description:
      'Defines margin between detected object and output edges. Higher values leave more whitespace around the product.',
  },
  object_layout_padding_axes: {
    key: 'object_layout_padding_axes',
    title: 'Object Layout Split X/Y Padding',
    description:
      'Lets you control horizontal and vertical padding separately for non-square framing or tighter composition.',
  },
  object_layout_fill_missing_canvas_white: {
    key: 'object_layout_fill_missing_canvas_white',
    title: 'Fill Missing Canvas With White',
    description:
      'When enabled and project canvas is larger than source, output expands to project canvas and fills uncovered area with white.',
  },
  object_layout_apply: {
    key: 'object_layout_apply',
    title: 'Run Object Layouting',
    description:
      'Processes active slot using object detection, centers/scales it with configured padding, then creates a linked layout variant.',
  },
  sequence_retries: {
    key: 'sequence_retries',
    title: 'Sequencer Retries',
    description:
      'Number of extra attempts after the first failure for this step. Range: 0-5. Value 0 means no retry.',
  },
  sequence_retry_backoff_ms: {
    key: 'sequence_retry_backoff_ms',
    title: 'Sequencer Retry Backoff (ms)',
    description:
      'Base delay between retries in milliseconds. Wait time scales by attempt (attempt 1 = backoff x1, attempt 2 = backoff x2).',
  },
  sequence_crop_padding_percent: {
    key: 'sequence_crop_padding_percent',
    title: 'Crop Padding (%)',
    description:
      'Expands crop boundaries outward from the selected crop area by a percentage (0-100). Higher values include more surrounding context.',
  },
  sequence_mask_feather: {
    key: 'sequence_mask_feather',
    title: 'Mask Feather',
    description:
      'Softens mask edges before generation (0-50). Higher feather creates smoother transitions between masked and unmasked areas.',
  },
  sequence_generate_output_count: {
    key: 'sequence_generate_output_count',
    title: 'Generate Output Count',
    description:
      'Overrides the number of outputs created by this Generate/Regenerate step (1-10). Leave empty to use project generation defaults.',
  },
  sequence_upscale_scale: {
    key: 'sequence_upscale_scale',
    title: 'Upscale Scale',
    description:
      'Output multiplier used by Upscale when strategy is "By Multiplier". Example: 2 means 2x width and 2x height.',
  },
  sequence_upscale_target_width: {
    key: 'sequence_upscale_target_width',
    title: 'Upscale Target Width',
    description:
      'Final output width in pixels when Upscale strategy is "By Resolution". Used together with Target Height.',
  },
  sequence_upscale_target_height: {
    key: 'sequence_upscale_target_height',
    title: 'Upscale Target Height',
    description:
      'Final output height in pixels when Upscale strategy is "By Resolution". Used together with Target Width.',
  },
  version_graph_merge_mode_toggle: {
    key: 'version_graph_merge_mode_toggle',
    title: 'Version Graph: Merge Mode',
    description:
      'Enables node multi-select for merge planning. Pick 2 or more nodes, then run Merge.',
  },
  version_graph_merge_execute: {
    key: 'version_graph_merge_execute',
    title: 'Version Graph: Execute Merge',
    description: 'Creates a merge output node from the currently selected merge candidates.',
  },
  version_graph_merge_clear_selection: {
    key: 'version_graph_merge_clear_selection',
    title: 'Version Graph: Clear Merge Selection',
    description: 'Clears the current merge candidate list without leaving merge mode.',
  },
  version_graph_composite_mode_toggle: {
    key: 'version_graph_composite_mode_toggle',
    title: 'Version Graph: Composite Mode',
    description:
      'Enables node multi-select for compositing. Pick 2 or more nodes, then run Composite.',
  },
  version_graph_composite_execute: {
    key: 'version_graph_composite_execute',
    title: 'Version Graph: Execute Composite',
    description: 'Creates a composite output node from selected source nodes and layer ordering.',
  },
  version_graph_composite_clear_selection: {
    key: 'version_graph_composite_clear_selection',
    title: 'Version Graph: Clear Composite Selection',
    description: 'Clears selected nodes for compositing without leaving composite mode.',
  },
  version_graph_compare_mode_toggle: {
    key: 'version_graph_compare_mode_toggle',
    title: 'Version Graph: Compare Mode',
    description:
      'Switches graph clicks into compare selection so two nodes can be inspected side by side.',
  },
  version_graph_collapse_all: {
    key: 'version_graph_collapse_all',
    title: 'Version Graph: Collapse All',
    description: 'Collapses every branch that has children to reduce graph density.',
  },
  version_graph_expand_all: {
    key: 'version_graph_expand_all',
    title: 'Version Graph: Expand All',
    description: 'Expands all collapsed branches to reveal full lineage.',
  },
  version_graph_stats_toggle: {
    key: 'version_graph_stats_toggle',
    title: 'Version Graph: Toggle Stats',
    description: 'Shows or hides the graph stats strip with node counts, depth, and mask totals.',
  },
  version_graph_minimap_toggle: {
    key: 'version_graph_minimap_toggle',
    title: 'Version Graph: Toggle Minimap',
    description: 'Shows or hides the minimap overlay for faster navigation on larger graphs.',
  },
  version_graph_export_png: {
    key: 'version_graph_export_png',
    title: 'Version Graph: Export PNG',
    description: 'Exports the current version graph view as a PNG image.',
  },
  version_graph_layout_dag: {
    key: 'version_graph_layout_dag',
    title: 'Version Graph: DAG Layout',
    description: 'Arranges nodes in directed graph layout grouped by lineage structure.',
  },
  version_graph_layout_timeline_h: {
    key: 'version_graph_layout_timeline_h',
    title: 'Version Graph: Horizontal Timeline Layout',
    description: 'Arranges nodes primarily left-to-right by operation order.',
  },
  version_graph_layout_timeline_v: {
    key: 'version_graph_layout_timeline_v',
    title: 'Version Graph: Vertical Timeline Layout',
    description: 'Arranges nodes primarily top-to-bottom by operation order.',
  },
  version_graph_zoom_out: {
    key: 'version_graph_zoom_out',
    title: 'Version Graph: Zoom Out',
    description: 'Decreases graph zoom level for a wider view.',
  },
  version_graph_zoom_in: {
    key: 'version_graph_zoom_in',
    title: 'Version Graph: Zoom In',
    description: 'Increases graph zoom level for detailed inspection.',
  },
  version_graph_fit_to_view: {
    key: 'version_graph_fit_to_view',
    title: 'Version Graph: Fit to View',
    description: 'Auto-centers and scales the graph so visible nodes fit inside the canvas.',
  },
  version_graph_filter_search: {
    key: 'version_graph_filter_search',
    title: 'Version Graph: Search Nodes',
    description: 'Filters visible nodes by ID, name, or metadata text.',
  },
  version_graph_filter_type_base: {
    key: 'version_graph_filter_type_base',
    title: 'Version Graph: Filter Base Nodes',
    description: 'Toggles visibility of Base node type in filtered graph view.',
  },
  version_graph_filter_type_generation: {
    key: 'version_graph_filter_type_generation',
    title: 'Version Graph: Filter Generation Nodes',
    description: 'Toggles visibility of Generation node type in filtered graph view.',
  },
  version_graph_filter_type_merge: {
    key: 'version_graph_filter_type_merge',
    title: 'Version Graph: Filter Merge Nodes',
    description: 'Toggles visibility of Merge node type in filtered graph view.',
  },
  version_graph_filter_type_composite: {
    key: 'version_graph_filter_type_composite',
    title: 'Version Graph: Filter Composite Nodes',
    description: 'Toggles visibility of Composite node type in filtered graph view.',
  },
  version_graph_filter_mask_cycle: {
    key: 'version_graph_filter_mask_cycle',
    title: 'Version Graph: Mask Filter Cycle',
    description: 'Cycles mask filter mode: any -> has mask -> no mask -> any.',
  },
  version_graph_filter_leaf_toggle: {
    key: 'version_graph_filter_leaf_toggle',
    title: 'Version Graph: Leaf-Only Filter',
    description: 'Shows only leaf nodes (nodes without children) when enabled.',
  },
  version_graph_filter_clear: {
    key: 'version_graph_filter_clear',
    title: 'Version Graph: Clear Filters',
    description: 'Resets search text and all active filter chips.',
  },
  version_graph_inspector_open_details: {
    key: 'version_graph_inspector_open_details',
    title: 'Version Graph Inspector: Open Details',
    description: 'Opens full node and file details for the selected node.',
  },
  version_graph_inspector_flatten_composite: {
    key: 'version_graph_inspector_flatten_composite',
    title: 'Version Graph Inspector: Flatten Composite',
    description: 'Renders a composite node into a single flattened output node.',
  },
  version_graph_inspector_refresh_composite_preview: {
    key: 'version_graph_inspector_refresh_composite_preview',
    title: 'Version Graph Inspector: Refresh Composite Preview',
    description: 'Rebuilds preview image for composite layers without flattening.',
  },
  version_graph_inspector_go_to_parent: {
    key: 'version_graph_inspector_go_to_parent',
    title: 'Version Graph Inspector: Go to Parent',
    description: 'Selects the first parent node of the currently selected node.',
  },
  version_graph_inspector_focus_node: {
    key: 'version_graph_inspector_focus_node',
    title: 'Version Graph Inspector: Focus Node',
    description: 'Pans graph viewport to center the selected node.',
  },
  version_graph_inspector_isolate_branch: {
    key: 'version_graph_inspector_isolate_branch',
    title: 'Version Graph Inspector: Isolate to New Card',
    description: 'Detaches the selected branch into a new card tree.',
  },
  version_graph_inspector_copy_node_id: {
    key: 'version_graph_inspector_copy_node_id',
    title: 'Version Graph Inspector: Copy Node ID',
    description: 'Copies selected node ID to clipboard.',
  },
  version_graph_inspector_details_button: {
    key: 'version_graph_inspector_details_button',
    title: 'Version Graph Inspector: Details Shortcut',
    description: 'Opens the same full details modal from the quick action row.',
  },
  version_graph_context_detach_subtree: {
    key: 'version_graph_context_detach_subtree',
    title: 'Version Graph Context: Detach Subtree',
    description: 'Creates a new card tree from the clicked node and its descendants.',
  },
  version_graph_context_isolate_new_card: {
    key: 'version_graph_context_isolate_new_card',
    title: 'Version Graph Context: Isolate to New Card',
    description: 'Detaches current node branch into a dedicated card for focused editing.',
  },
  version_graph_context_toggle_collapse: {
    key: 'version_graph_context_toggle_collapse',
    title: 'Version Graph Context: Collapse or Expand Branch',
    description: 'Toggles child branch visibility for the clicked node.',
  },
  version_graph_context_add_to_composite: {
    key: 'version_graph_context_add_to_composite',
    title: 'Version Graph Context: Add to Composite',
    description: 'Adds clicked node into current composite selection workflow.',
  },
  version_graph_context_compare_with: {
    key: 'version_graph_context_compare_with',
    title: 'Version Graph Context: Compare With',
    description: 'Starts compare mode using clicked node as the first compare target.',
  },
  version_graph_context_copy_id: {
    key: 'version_graph_context_copy_id',
    title: 'Version Graph Context: Copy ID',
    description: 'Copies clicked node ID to clipboard.',
  },
  version_graph_compare_open_details: {
    key: 'version_graph_compare_open_details',
    title: 'Version Graph Compare: Open Details',
    description: 'Opens full details for either compared node.',
  },
  version_graph_compare_swap: {
    key: 'version_graph_compare_swap',
    title: 'Version Graph Compare: Swap Nodes',
    description: 'Swaps left and right compared nodes in the compare panel.',
  },
  version_graph_compare_exit: {
    key: 'version_graph_compare_exit',
    title: 'Version Graph Compare: Exit Compare',
    description: 'Closes compare mode and returns to normal inspector view.',
  },
  version_graph_node_toggle_collapse: {
    key: 'version_graph_node_toggle_collapse',
    title: 'Version Graph Node: Collapse Toggle',
    description: 'Collapses or expands children directly from the node tile control.',
  },
  version_graph_node_open_details: {
    key: 'version_graph_node_open_details',
    title: 'Version Graph Node: Open Details Icon',
    description: 'Opens full details modal from the node-level info icon.',
  },
  version_graph_isolation_clear: {
    key: 'version_graph_isolation_clear',
    title: 'Version Graph: Clear Isolation',
    description: 'Exits isolated branch mode and restores full graph visibility.',
  },
};

export function getImageStudioDocTooltip(key: ImageStudioDocKey): string {
  const entry = IMAGE_STUDIO_DOCS[key];
  return `${entry.title}: ${entry.description}`;
}
