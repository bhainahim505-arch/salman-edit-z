package com.salmanedit;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.unity3d.ads.IUnityAdsInitializationListener;
import com.unity3d.ads.IUnityAdsLoadListener;
import com.unity3d.ads.IUnityAdsShowListener;
import com.unity3d.ads.UnityAds;
import com.unity3d.services.banners.BannerErrorInfo;
import com.unity3d.services.banners.BannerView;
import com.unity3d.services.banners.UnityBannerSize;

@CapacitorPlugin(name = "UnityAds")
public class UnityAdsPlugin extends Plugin {

    private BannerView bannerView;

    @PluginMethod
    public void initialize(PluginCall call) {
        String gameId = call.getString("gameId", "6067350");
        boolean testMode = Boolean.TRUE.equals(call.getBoolean("testMode", false));

        UnityAds.initialize(getActivity(), gameId, testMode, new IUnityAdsInitializationListener() {
            @Override
            public void onInitializationComplete() {
                call.resolve();
            }

            @Override
            public void onInitializationFailed(UnityAds.UnityAdsInitializationError error, String message) {
                call.reject("Unity Ads init failed: " + message);
            }
        });
    }

    @PluginMethod
    public void load(PluginCall call) {
        String placementId = call.getString("placementId", "");
        UnityAds.load(placementId, new IUnityAdsLoadListener() {
            @Override
            public void onUnityAdsAdLoaded(String placementId) {
                call.resolve();
            }

            @Override
            public void onUnityAdsFailedToLoad(String placementId, UnityAds.UnityAdsLoadError error, String message) {
                call.reject("Load failed: " + message);
            }
        });
    }

    @PluginMethod
    public void show(PluginCall call) {
        String placementId = call.getString("placementId", "");
        UnityAds.show(getActivity(), placementId, new IUnityAdsShowListener() {
            @Override
            public void onUnityAdsShowFailure(String placementId, UnityAds.UnityAdsShowError error, String message) {
                call.reject("Show failed: " + message);
            }

            @Override
            public void onUnityAdsShowStart(String placementId) {}

            @Override
            public void onUnityAdsShowClick(String placementId) {}

            @Override
            public void onUnityAdsShowComplete(String placementId, UnityAds.UnityAdsShowCompletionState state) {
                JSObject result = new JSObject();
                result.put("rewarded", state == UnityAds.UnityAdsShowCompletionState.COMPLETED);
                call.resolve(result);
            }
        });
    }

    @PluginMethod
    public void showBanner(PluginCall call) {
        String placementId = call.getString("placementId", "Banner_Android");
        getActivity().runOnUiThread(() -> {
            bannerView = new BannerView(getActivity(), placementId, UnityBannerSize.getDynamicSize());
            bannerView.setListener(new BannerView.IListener() {
                @Override public void onBannerLoaded(BannerView bannerAdView) {}
                @Override public void onBannerClick(BannerView bannerAdView) {}
                @Override public void onBannerFailedToLoad(BannerView bannerAdView, BannerErrorInfo errorInfo) {}
                @Override public void onBannerLeftApplication(BannerView bannerAdView) {}
            });
            bannerView.load();
            call.resolve();
        });
    }

    @PluginMethod
    public void hideBanner(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (bannerView != null) {
                bannerView.destroy();
                bannerView = null;
            }
            call.resolve();
        });
    }
}
