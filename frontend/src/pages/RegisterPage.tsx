import { useState, type FormEvent } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import { useAuth } from '../contexts/AuthContext';
import { AxiosError } from 'axios';
import type { ErrorResponse } from '../types/auth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) errors.name = 'Nome é obrigatório';
    else if (name.length > 100) errors.name = 'Nome deve ter no máximo 100 caracteres';

    if (!email.trim()) errors.email = 'Email é obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Formato de email inválido';

    if (!password) errors.password = 'Palavra-passe é obrigatória';
    else if (password.length < 8) errors.password = 'Palavra-passe deve ter pelo menos 8 caracteres';

    if (password !== confirmPassword) errors.confirmPassword = 'As palavras-passe não coincidem';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      if (err instanceof AxiosError) {
        if (err.response) {
          const data = err.response.data as ErrorResponse;
          setError(data.message || 'Erro ao criar conta');
        } else {
          setError('Falha de comunicação com o servidor');
        }
      } else {
        setError('Erro inesperado');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              component="img"
              src="/logo.png"
              alt="IGNIS OAZ"
              sx={{ height: 80, mb: 2 }}
            />
            <Typography variant="h5" component="h1" gutterBottom>
              Criar Conta
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              label="Nome"
              fullWidth
              required
              margin="normal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              inputProps={{ maxLength: 100 }}
              disabled={loading}
              error={!!fieldErrors.name}
              helperText={fieldErrors.name}
              autoComplete="name"
            />
            <TextField
              label="Email"
              type="email"
              fullWidth
              required
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputProps={{ maxLength: 254 }}
              disabled={loading}
              error={!!fieldErrors.email}
              helperText={fieldErrors.email}
              autoComplete="email"
            />
            <TextField
              label="Palavra-passe"
              type="password"
              fullWidth
              required
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              inputProps={{ maxLength: 128 }}
              disabled={loading}
              error={!!fieldErrors.password}
              helperText={fieldErrors.password || 'Mínimo 8 caracteres, com maiúscula, minúscula e dígito'}
              autoComplete="new-password"
            />
            <TextField
              label="Confirmar palavra-passe"
              type="password"
              fullWidth
              required
              margin="normal"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              inputProps={{ maxLength: 128 }}
              disabled={loading}
              error={!!fieldErrors.confirmPassword}
              helperText={fieldErrors.confirmPassword}
              autoComplete="new-password"
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ mt: 2, mb: 2 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Criar Conta'}
            </Button>
          </Box>

          <Typography variant="body2" align="center">
            Já tem conta?{' '}
            <Link component={RouterLink} to="/login">
              Iniciar sessão
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
