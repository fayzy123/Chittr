import React from 'react';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faHome, faSearch, faUser } from '@fortawesome/free-solid-svg-icons';

const FooterBar = (props) => {
  return (
    <BottomTabBar
      {...props}
      activeTintColor="#2ecc71"
      inactiveTintColor="gray"
      renderIcon={({ route, color, size }) => {
        let icon;
        if (route.name === 'Home') icon = faHome;
        else if (route.name === 'Search') icon = faSearch;
        else if (route.name === 'Profile') icon = faUser;

        return <FontAwesomeIcon icon={icon} color={color} size={size || 24} />;
      }}
    />
  );
};

export default FooterBar;
