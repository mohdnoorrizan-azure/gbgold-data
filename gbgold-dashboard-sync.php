<?php
/*
Plugin Name: GBGold Dashboard Sync Engine
Plugin URI: https://infogbgold.my
Description: Enjin penyelarasan automatik dari GitHub ke WordPress untuk Dashboard GBGold.
Version: 1.0.0
Author: Antigravity AI
Author URI: https://deepmind.google
License: GPL2
*/

if (!defined('ABSPATH')) {
    exit; // Keluar jika diakses secara terus
}

// Dengar isyarat webhook
add_action('init', 'gbgold_webhook_listener');

// Daftar Shortcode
add_shortcode('infogbgold_dashboard', 'gbgold_dashboard_shortcode_render');

function gbgold_dashboard_shortcode_render() {
    // Parameter masa (?v=...) ditambah untuk mengelakkan cache browser
    $url = plugin_dir_url(__FILE__) . 'dashboard/index.html?v=' . time();
    return '<iframe src="' . esc_url($url) . '" width="100%" height="1250px" style="border:none; border-radius:16px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); margin-bottom: 24px;"></iframe>';
}

function gbgold_webhook_listener() {
    if (isset($_GET['gbgold_webhook']) && $_GET['gbgold_webhook'] == '1') {
        
        $key = isset($_GET['key']) ? $_GET['key'] : '';
        $secure_key = 'gbgold-sync-2026'; // Mesti sama dengan kunci dalam deploy.yml
        
        if ($key !== $secure_key) {
            status_header(403);
            header('Content-Type: application/json');
            echo json_encode(["success" => false, "message" => "Akses ditolak. Kunci keselamatan salah."]);
            exit;
        }
        
        // Had kadar penyelarasan (1 kali setiap 60 saat) untuk mengelakkan beban pelayan
        $last_sync = get_transient('gbgold_last_sync');
        if ($last_sync) {
            status_header(429);
            header('Content-Type: application/json');
            echo json_encode(["success" => false, "message" => "Had laju dicapai. Sila tunggu 60 saat."]);
            exit;
        }
        set_transient('gbgold_last_sync', time(), 60);
        
        // Hantar maklum balas 200 OK serta-merta dan tutup sambungan
        // supaya proses muat turun boleh berjalan di latar belakang (background process)
        status_header(200);
        header('Content-Type: application/json');
        echo json_encode(["success" => true, "message" => "Isyarat diterima. Memulakan penyelarasan di latar belakang..."]);
        
        if (function_exists('fastcgi_finish_request')) {
            fastcgi_finish_request();
        } else {
            if (ob_get_level()) ob_end_clean();
            header("Connection: close");
            header("Content-Length: 0");
            ob_start();
            echo "";
            ob_end_flush();
            flush();
        }
        
        // Jalankan proses penyelarasan
        gbgold_execute_sync();
        exit;
    }
}

function gbgold_execute_sync() {
    // --- KONFIGURASI GITHUB ---
    // Sila tukar nama pemilik repositori mengikut akaun GitHub anda.
    $repo_owner = 'tuanizan'; 
    $repo_name = 'gbgold-data';  
    $branch = 'main';
    
    // GITHUB TOKEN (Sila masukkan Classic Token dengan akses 'repo' jika repositori anda adalah PRIVATE)
    // Jika repositori anda adalah PUBLIC, biarkan kosong ''.
    $github_token = ''; 
    
    $url = "https://api.github.com/repos/{$repo_owner}/{$repo_name}/zipball/{$branch}";
    
    $args = [
        'timeout' => 300,
        'headers' => [
            'User-Agent' => 'WordPress GBGold Sync Engine',
            'Accept' => 'application/vnd.github+json'
        ]
    ];
    
    if (!empty($github_token)) {
        $args['headers']['Authorization'] = 'token ' . $github_token;
    }
    
    $response = wp_remote_get($url, $args);
    
    if (is_wp_error($response)) {
        error_log("GBGold Sync Error: Gagal memuat turun fail zip dari GitHub. " . $response->get_error_message());
        return;
    }
    
    $zip_content = wp_remote_retrieve_body($response);
    
    // Simpan ke fail sementara
    $tmp_file = wp_tempnam('gbgold_sync_');
    if (!$tmp_file) {
        error_log("GBGold Sync Error: Gagal membuat fail sementara.");
        return;
    }
    
    file_put_contents($tmp_file, $zip_content);
    
    // Ekstrak fail zip menggunakan WordPress Filesystem API
    require_once(ABSPATH . 'wp-admin/includes/file.php');
    WP_Filesystem();
    
    $target_dir = plugin_dir_path(__FILE__) . 'dashboard/'; // Simpan dalam folder plugin sendiri
    
    // Bina folder jika belum wujud
    if (!file_exists($target_dir)) {
        wp_mkdir_p($target_dir);
    }
    
    $tmp_extract_dir = $target_dir . 'tmp_extract/';
    $unzipfile = unzip_file($tmp_file, $tmp_extract_dir);
    unlink($tmp_file); // Padam fail zip sementara
    
    if (is_wp_error($unzipfile)) {
        error_log("GBGold Sync Error: Gagal mengekstrak fail zip. " . $unzipfile->get_error_message());
        return;
    }
    
    // GitHub membungkus fail zip di dalam folder dinamik (contoh: tuanizan-gbgold-data-sha123/)
    $extracted_folders = glob($tmp_extract_dir . '*', GLOB_ONLYDIR);
    if (empty($extracted_folders)) {
        error_log("GBGold Sync Error: Folder hasil ekstrak tidak dijumpai.");
        gbgold_recursive_rmdir($tmp_extract_dir);
        return;
    }
    
    $source_dir = $extracted_folders[0] . '/';
    
    // --- PEMINDAHAN FAIL (MENGECUALIKAN DATA.JSON) ---
    // Kami hanya memindahkan fail kod sahaja. Fail data.json tidak akan disentuh!
    $files_to_copy = ['index.html', 'styles.css', 'app.js', 'save_data.php'];
    
    foreach ($files_to_copy as $file) {
        $src = $source_dir . $file;
        $dst = $target_dir . $file;
        
        if (file_exists($src)) {
            copy($src, $dst);
            error_log("GBGold Sync: Fail {$file} berjaya disalin.");
        }
    }
    
    // Padam folder sementara
    gbgold_recursive_rmdir($tmp_extract_dir);
    
    // Kosongkan cache untuk memastikan perubahan terus kelihatan
    if (class_exists('LiteSpeed_Cache_API') && method_exists('LiteSpeed_Cache_API', 'purge_all')) {
        LiteSpeed_Cache_API::purge_all();
    }
    if (function_exists('opcache_reset')) {
        opcache_reset();
    }
    
    error_log("GBGold Sync: Penyelarasan selesai sepenuhnya!");
}

function gbgold_recursive_rmdir($dir) {
    if (is_dir($dir)) {
        $objects = scandir($dir);
        foreach ($objects as $object) {
            if ($object != "." && $object != "..") {
                if (is_dir($dir . "/" . $object) && !is_link($dir . "/" . $object)) {
                    gbgold_recursive_rmdir($dir . "/" . $object);
                } else {
                    unlink($dir . "/" . $object);
                }
            }
        }
        rmdir($dir);
    }
}
?>
