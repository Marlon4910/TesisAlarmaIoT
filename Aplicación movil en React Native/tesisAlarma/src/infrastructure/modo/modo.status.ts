let alarmMode = 0; // 0 = Configuración, 1 = Exterior, 2 = Completo

// Permite colocar el modo de alarma internamente
export const setAlarmMode = (mode: number) => {
  alarmMode = mode;
  console.log('Modo actualizado:', alarmMode); // Verifica que el modo se actualiza correctamente
};

// Permite obtener el modo de alarma
export const getAlarmMode = () => {
  console.log('Modo obtenido:', alarmMode); // Verifica el modo actual
  return alarmMode;
};
