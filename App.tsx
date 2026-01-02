import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { HomeScreen } from './screens/Home';
import { ClientsScreen } from './screens/Clients';
import { ProductsScreen } from './screens/Products';
import { AnalyticsScreen } from './screens/Analytics';
import { NewSaleScreen } from './screens/NewSale';
import { SCREENS } from './constants';
import { db } from './services/db';
import { Client, Product, Sale } from './types';


const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState(SCREENS.HOME);
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);

  // Initialize empty state
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Simple refresh trigger mechanism
  const [refreshKey, setRefreshKey] = useState(0);
  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  // Fetch data from API on mount and refresh
  React.useEffect(() => {
    const sync = async () => {
      try {
        const [s, p, c] = await Promise.all([
          db.getSales(),
          db.getProducts(),
          db.getClients()
        ]);
        setSales(s);
        setProducts(p);
        setClients(c);
      } catch (e) {
        console.error("Failed to sync data", e);
      }
    };
    sync();
  }, [refreshKey]);

  const renderScreen = () => {
    switch (activeTab) {
      case SCREENS.HOME:
        return <HomeScreen
          onNavigate={setActiveTab}
          onRequestNewSale={() => setIsNewSaleOpen(true)}
          initialSales={sales}
        />;
      case SCREENS.CLIENTS:
        return <ClientsScreen initialClients={clients} initialSales={sales} />;
      case SCREENS.PRODUCTS:
        return <ProductsScreen initialProducts={products} />;
      case SCREENS.ANALYSIS:
        return <AnalyticsScreen />;
      default:
        // Handle sub-routes crudely for the demo
        if (activeTab === 'clients_add') {
          setTimeout(() => setActiveTab(SCREENS.CLIENTS), 100);
          return null;
        }
        if (activeTab === 'products_add') {
          setTimeout(() => setActiveTab(SCREENS.PRODUCTS), 100);
          return null;
        }
        return <HomeScreen
          onNavigate={setActiveTab}
          onRequestNewSale={() => setIsNewSaleOpen(true)}
          initialSales={sales}
        />;
    }
  };

  return (
    <>
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        <div key={refreshKey} className="animate-in fade-in duration-300">
          {renderScreen()}
        </div>
      </Layout>

      <NewSaleScreen
        isOpen={isNewSaleOpen}
        onClose={() => setIsNewSaleOpen(false)}
        onComplete={() => {
          handleRefresh();
          setActiveTab(SCREENS.HOME); // Go back to home to see new sale
        }}
      />
    </>
  );
};

export default App;
