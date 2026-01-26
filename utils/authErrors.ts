export const translateAuthError = (error: any): string => {
    if (!error) return 'Ocorreu um erro desconhecido.';

    // Convert error message to lowercase for easier matching
    const msg = (error.message || '').toLowerCase();

    // Map common Supabase/Auth errors
    if (msg.includes('invalid login credentials')) {
        return 'Email não encontrado ou senha incorreta.';
    }
    if (msg.includes('email not confirmed')) {
        return 'Email não confirmado. Verifique sua caixa de entrada.';
    }
    if (msg.includes('user already registered') || msg.includes('unique constraint')) {
        return 'Este email já está cadastrado. Tente fazer login.';
    }
    if (msg.includes('password should be at least')) {
        return 'A senha deve ter no mínimo 6 caracteres.';
    }
    if (msg.includes('invalid email') || msg.includes('validation failed')) {
        return 'Digite um email válido (ex: nome@email.com).';
    }
    if (msg.includes('rate limit')) {
        return 'Muitas tentativas. Aguarde alguns instantes e tente novamente.';
    }
    if (msg.includes('network')) {
        return 'Erro de conexão. Verifique sua internet.';
    }

    // Default fallback (try to show the original if meaningful, or generic)
    return error.message || 'Ocorreu um erro ao tentar acessar. Tente novamente.';
};
