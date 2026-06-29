//src/navigation/index.js
import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../theme';
import { LoadingScreen } from '../components';


// Screens
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import UsersScreen from '../screens/UsersScreen';
import UserFormScreen from '../screens/UserFormScreen';
import TechniciensScreen from '../screens/TechniciensScreen';
import TechnicienFormScreen from '../screens/TechnicienFormScreen';
import TachesScreen from '../screens/TachesScreen';
import RapportsScreen from '../screens/RapportsScreen';
import RapportFormScreen from '../screens/RapportFormScreen';
import RapportDetailScreen from '../screens/RapportDetailScreen';
import IncidentsScreen from '../screens/IncidentsScreen';
import IncidentFormScreen from '../screens/IncidentFormScreen';
import ReseauScreen from '../screens/ReseauScreen';
import StatistiquesScreen from '../screens/StatistiquesScreen';
import ProfilScreen from '../screens/ProfilScreen';
import MessagesScreen from '../screens/MessagesScreen';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import NotificationsScreen from '../screens/NotificationsScreen';
import WelcomeScreen from '../screens/WelcomeScreen';



const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabIcon = ({ name, focused, color }) => {

  const routeName = name || 'help-circle-outline';
  let iconName = 'help-circle-outline';

  switch (routeName) {
    case 'Dashboard': iconName = focused ? 'view-grid' : 'view-grid-outline'; break;
    case 'Rapports': iconName = focused ? 'file-document' : 'file-document-outline'; break;
    case 'Incidents': iconName = focused ? 'alert-circle' : 'alert-circle-outline'; break;
    case 'Messages':iconName = focused ? 'message-text' : 'message-text-outline'; break;
    case 'Réseau': iconName = focused ? 'router-network' : 'router-wireless'; break;
    case 'Statistiques': iconName = 'chart-bar'; break;
    case 'Profil': iconName = focused ? 'account' : 'account-outline'; break;
    default: iconName = 'help-circle-outline';
  }

  return <Icon name={iconName} size={26} color={color} />;
};

function MainTabs() {
  const { isAdmin, isSuperviseur } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color }) => (
          <TabIcon name={route?.name} focused={focused} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: 'Accueil' }} />
      <Tab.Screen name="Rapports" component={RapportsStack} />
      <Tab.Screen name="Incidents" component={IncidentsStack} />
      <Tab.Screen name="Messages"component={MessagesScreen} />
      <Tab.Screen name="Réseau" component={ReseauScreen} />
      {(isAdmin || isSuperviseur) && (
        <Tab.Screen name="Statistiques" component={StatistiquesScreen} />
      )}
      <Tab.Screen name="Profil" component={ProfilScreen} />
    </Tab.Navigator>
  );
}

function RapportsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RapportsList" component={RapportsScreen} />
      <Stack.Screen name="RapportForm" component={RapportFormScreen} />
      <Stack.Screen name="RapportDetail" component={RapportDetailScreen} />

    </Stack.Navigator>
  );
}

function IncidentsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="IncidentsList" component={IncidentsScreen} />
      <Stack.Screen name="IncidentForm" component={IncidentFormScreen} />
    </Stack.Navigator>
  );
}

export default function Navigation() {
  const { user, loading } = useAuth();
  const [firstLaunch, setFirstLaunch] = useState(true);

  if (loading) return <LoadingScreen />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>

        {firstLaunch && !user ? (
          <>
            <Stack.Screen name="Welcome">
              {(props) => (
                <WelcomeScreen
                  {...props}
                  onFinish={() => setFirstLaunch(false)}
                />
              )}
            </Stack.Screen>

            <Stack.Screen name="Login" component={LoginScreen} />
          </>
        ) : !user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Users" component={UsersScreen} />
            <Stack.Screen name="UserForm" component={UserFormScreen} />
            <Stack.Screen name="Techniciens" component={TechniciensScreen} />
            <Stack.Screen name="TechnicienForm" component={TechnicienFormScreen} />
            <Stack.Screen name="TachesList" component={TachesScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
          </>
        )}

      </Stack.Navigator>
    </NavigationContainer>
  );
}



const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 0,
    elevation: 20,
    shadowColor: '#000',
    height: 60,
    paddingBottom: 6,
  },
  tabLabel: { fontSize: 10, fontWeight: '600' },
});