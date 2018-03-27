/** @format */

/**
 * External dependencies
 */

import { join } from 'lodash';

export const SITE_REQUEST_FIELDS = join( [
	'ID',
	'URL',
	'name',
	'capabilities',
	'jetpack',
	'visible',
	'is_private',
	'is_vip',
	'icon',
	'plan',
	'jetpack_modules',
	'single_user_site',
	'is_multisite',
	'options',
] );

export const SITE_REQUEST_OPTIONS = join( [
	'is_mapped_domain',
	'unmapped_url',
	'admin_url',
	'is_redirect',
	'is_automated_transfer',
	'allowed_file_types',
	'show_on_front',
	'main_network_site',
	'jetpack_version',
	'software_version',
	'default_post_format',
	'created_at',
	'frame_nonce',
	'publicize_permanently_disabled',
	'page_on_front',
	'page_for_posts',
	'advanced_seo_front_page_description',
	'advanced_seo_title_formats',
	'verification_services_codes',
	'podcasting_archive',
	'is_domain_only',
	'default_sharing_status',
	'default_ping_status',
	'default_comment_status',
	'default_likes_enabled',
	'wordads',
	'upgraded_filetypes_enabled',
	'videopress_enabled',
	'permalink_structure',
	'gmt_offset',
	'is_wpcom_store',
	'signup_is_store',
	'has_pending_automated_transfer',
	'woocommerce_is_active',
	'design_type',
	'site_goals',
] );
