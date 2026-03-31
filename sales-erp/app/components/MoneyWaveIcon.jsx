import { FaMoneyBillWave } from 'react-icons/fa';

const MoneyWaveIcon = ({ className = "" }) => {
  return (
    <FaMoneyBillWave 
      // text-orange-500 is the standard Tailwind orange for a clean look
      className={`text-orange-500 ${className}`} 
      style={{ fontSize: '1.5rem' }} // Default size, can be overridden by className
    />
  );
};

export default MoneyWaveIcon;