import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';

export default function App() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'tracker' | 'driver'>('catalog');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFDF7" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>🥚</Text>
          </View>
          <View>
            <Text style={styles.brandSubtitle}>OVOVITA FARM DIRECT</Text>
            <Text style={styles.brandTitle}>Morning Harvest Rush</Text>
          </View>
        </View>
        <View style={styles.etaPill}>
          <Text style={styles.etaText}>⚡ 15-30m</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Zero-Crack Molded Pulp Packaging</Text>
          <Text style={styles.bannerDesc}>
            Laid at sunrise today, candling inspection passed, and delivered safe in shock-absorbing trays.
          </Text>
          <View style={styles.podTag}>
            <Text style={styles.podText}>✓ 100% Pay on Delivery (Cash / UPI QR)</Text>
          </View>
        </View>

        {activeTab === 'catalog' && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Daily Fresh Harvest</Text>

            {/* Product Card 1 */}
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.productBadge}>CANDLING TEST PASSED</Text>
                  <Text style={styles.productTitle}>Classic Farm White Eggs</Text>
                  <Text style={styles.farmOrigin}>Chikkaballapur Direct Hatchery</Text>
                </View>
                <Text style={styles.priceHighlight}>₹195</Text>
              </View>
              <View style={styles.unitRow}>
                <View style={[styles.unitChip, styles.unitChipActive]}>
                  <Text style={styles.unitChipTextActive}>30-Egg Farm Tray</Text>
                  <Text style={styles.unitPriceTextActive}>₹195 (Save 7%)</Text>
                </View>
                <View style={styles.unitChip}>
                  <Text style={styles.unitChipText}>12-Egg Dozen</Text>
                  <Text style={styles.unitPriceText}>₹78</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.actionBtn}>
                <Text style={styles.actionBtnText}>Add 30-Egg Tray • ₹195</Text>
              </TouchableOpacity>
            </View>

            {/* Product Card 2 - Brown Eggs */}
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View>
                  <Text style={[styles.productBadge, { color: '#9A3412', backgroundColor: '#FFEDD5' }]}>THICK SHELL • DENSE WHITE</Text>
                  <Text style={styles.productTitle}>Farm Brown Heritage Eggs</Text>
                  <Text style={styles.farmOrigin}>Hosur Valley Poultry Estate</Text>
                </View>
                <Text style={styles.priceHighlight}>₹235</Text>
              </View>
              <View style={styles.unitRow}>
                <View style={[styles.unitChip, styles.unitChipActive]}>
                  <Text style={styles.unitChipTextActive}>30-Egg Farm Tray</Text>
                  <Text style={styles.unitPriceTextActive}>₹235 (Save 8%)</Text>
                </View>
                <View style={styles.unitChip}>
                  <Text style={styles.unitChipText}>12-Egg Dozen</Text>
                  <Text style={styles.unitPriceText}>₹96</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.actionBtn}>
                <Text style={styles.actionBtnText}>Add 30-Egg Tray • ₹235</Text>
              </TouchableOpacity>
            </View>

            {/* Product Card 3 - Free-Range Desi Eggs */}
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.productBadgeDesi}>FREE RANGE • RICH YOLK</Text>
                  <Text style={styles.productTitle}>Free-Range Desi Eggs</Text>
                  <Text style={styles.farmOrigin}>Mandya Organic Pasture Farm</Text>
                </View>
                <Text style={styles.priceHighlight}>₹330</Text>
              </View>
              <View style={styles.unitRow}>
                <View style={[styles.unitChip, styles.unitChipActive]}>
                  <Text style={styles.unitChipTextActive}>30-Egg Farm Tray</Text>
                  <Text style={styles.unitPriceTextActive}>₹330 (Save 8%)</Text>
                </View>
                <View style={styles.unitChip}>
                  <Text style={styles.unitChipText}>12-Egg Dozen</Text>
                  <Text style={styles.unitPriceText}>₹138</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.actionBtn}>
                <Text style={styles.actionBtnText}>Add 30-Egg Tray • ₹330</Text>
              </TouchableOpacity>
            </View>

            {/* Product Card 4 - Organic Omega-3 */}
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View>
                  <Text style={[styles.productBadge, { color: '#047857', backgroundColor: '#D1FAE5' }]}>DHA RICH • FLAXSEED DIET</Text>
                  <Text style={styles.productTitle}>Organic Omega-3 Enriched Eggs</Text>
                  <Text style={styles.farmOrigin}>Kolar Organic Farms</Text>
                </View>
                <Text style={styles.priceHighlight}>₹390</Text>
              </View>
              <View style={styles.unitRow}>
                <View style={[styles.unitChip, styles.unitChipActive]}>
                  <Text style={styles.unitChipTextActive}>30-Egg Farm Tray</Text>
                  <Text style={styles.unitPriceTextActive}>₹390 (Save 7%)</Text>
                </View>
                <View style={styles.unitChip}>
                  <Text style={styles.unitChipText}>12-Egg Dozen</Text>
                  <Text style={styles.unitPriceText}>₹160</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.actionBtn}>
                <Text style={styles.actionBtnText}>Add 30-Egg Tray • ₹390</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeTab === 'tracker' && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Live Order #EGG-20260829-0001</Text>
            <View style={styles.card}>
              <Text style={styles.etaTitle}>Arriving in 14 mins</Text>
              <Text style={styles.etaDesc}>Estimated at 7:15 AM • Koramangala Hub Run</Text>

              <View style={styles.riderBox}>
                <Text style={styles.riderName}>Ramesh Kumar (KA-01-EQ-9872)</Text>
                <Text style={styles.riderDesc}>Zero-Crack Certified Courier • 950m away</Text>
              </View>

              <View style={styles.doorstepContractBox}>
                <Text style={styles.contractTitle}>Doorstep Unboxing Contract</Text>
                <Text style={styles.contractDesc}>
                  Inspect your eggs before payment. Driver carries a buffer tray for instant swaps!
                </Text>
                <Text style={styles.podAmount}>Due: ₹195 (Cash or UPI QR)</Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'driver' && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Delivery Partner POS Mode</Text>
            <View style={styles.card}>
              <Text style={styles.productTitle}>Ramesh Kumar • Run Sheet</Text>
              <Text style={styles.farmOrigin}>Vehicle: KA-01-EQ-9872 • Buffer Stock: 6 Eggs</Text>

              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#059669', marginTop: 12 }]}>
                <Text style={styles.actionBtnText}>Generate Dynamic Bharat UPI QR</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#B45309', marginTop: 8 }]}>
                <Text style={styles.actionBtnText}>Handle Cracked Egg (Buffer Swap)</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab('catalog')}
          style={[styles.tabItem, activeTab === 'catalog' && styles.tabItemActive]}
        >
          <Text style={[styles.tabLabel, activeTab === 'catalog' && styles.tabLabelActive]}>
            🥚 Explore
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('tracker')}
          style={[styles.tabItem, activeTab === 'tracker' && styles.tabItemActive]}
        >
          <Text style={[styles.tabLabel, activeTab === 'tracker' && styles.tabLabelActive]}>
            📍 Live Track
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('driver')}
          style={[styles.tabItem, activeTab === 'driver' && styles.tabItemActive]}
        >
          <Text style={[styles.tabLabel, activeTab === 'driver' && styles.tabLabelActive]}>
            🛵 Driver POS
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EEDF',
    backgroundColor: '#FFFDF7',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logoText: {
    fontSize: 20,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 1,
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  etaPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  etaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  banner: {
    backgroundColor: '#FEF3C7',
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8D4B00',
    marginBottom: 4,
  },
  bannerDesc: {
    fontSize: 11,
    color: '#6E3900',
    lineHeight: 16,
  },
  podTag: {
    marginTop: 8,
    backgroundColor: '#FFFDF7',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  podText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#FBF8F1',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3EEDF',
    padding: 14,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  productBadgeDesi: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  farmOrigin: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  priceHighlight: {
    fontSize: 18,
    fontWeight: '800',
    color: '#D97706',
  },
  unitRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  unitChip: {
    flex: 1,
    backgroundColor: '#FFFDF7',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#F3EEDF',
    alignItems: 'center',
  },
  unitChipActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
  },
  unitChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  unitChipTextActive: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  unitPriceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  unitPriceTextActive: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
    marginTop: 2,
  },
  actionBtn: {
    backgroundColor: '#D97706',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  etaTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#D97706',
  },
  etaDesc: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  riderBox: {
    backgroundColor: '#FFFDF7',
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F3EEDF',
  },
  riderName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  riderDesc: {
    fontSize: 11,
    color: '#059669',
    marginTop: 2,
    fontWeight: '600',
  },
  doorstepContractBox: {
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  contractTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  contractDesc: {
    fontSize: 11,
    color: '#005137',
    marginTop: 2,
  },
  podAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#002114',
    marginTop: 6,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3EEDF',
    backgroundColor: '#FFFDF7',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: '#FEF3C7',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  tabLabelActive: {
    color: '#D97706',
    fontWeight: '800',
  },
});
